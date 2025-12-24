'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Message,
  ChatEvent,
  Session,
  SessionDetailResponse,
  PermissionMode,
  ToolApprovalRequest,
  ToolApprovalResponse,
  ToolCall,
} from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

interface UseChatOptions {
  sessionId?: string;
}

interface SendMessageOptions {
  permissionMode?: PermissionMode;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  session: Session | null;
  pendingToolApproval: ToolApprovalRequest | null;
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;
  stopGeneration: () => void;
  respondToToolApproval: (response: ToolApprovalResponse) => Promise<void>;
}

export function useChat({ sessionId }: UseChatOptions = {}): UseChatReturn {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [pendingToolApproval, setPendingToolApproval] = useState<ToolApprovalRequest | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async (): Promise<SessionDetailResponse> => {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      return response.json();
    },
    enabled: !!sessionId,
    staleTime: 0, // Always refetch when session changes
  });

  // Load session data when query completes or sessionId changes
  useEffect(() => {
    if (sessionData) {
      setSession(sessionData.session);
      setMessages(sessionData.messages);
    } else if (!sessionId) {
      setSession(null);
      setMessages([]);
    }
  }, [sessionId, sessionData]);

  const sendMessage = useCallback(
    async (content: string, options?: SendMessageOptions) => {
      setIsGenerating(true);
      setError(null);

      const userMessage: Message = {
        id: generateUUID(),
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            sessionId: session?.id,
            settings: options?.permissionMode ? { permissionMode: options.permissionMode } : undefined,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let assistantMessageId: string | null = null;

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const event: ChatEvent = JSON.parse(data);

              switch (event.type) {
                case 'init':
                  if (!session) {
                    setSession({
                      id: event.sessionId,
                      title: content.slice(0, 50),
                      claudeSessionId: event.claudeSessionId,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      settings: null,
                      isArchived: false,
                    });
                    queryClient.invalidateQueries({ queryKey: ['sessions'] });
                  }
                  break;

                case 'message':
                  setMessages((prev) => {
                    // Find existing assistant message by ID
                    const existingIndex = assistantMessageId
                      ? prev.findIndex((m) => m.id === assistantMessageId)
                      : -1;

                    // If existing message has toolCalls, create a new message instead
                    // (this means tool execution happened and we should start fresh)
                    if (existingIndex !== -1 && prev[existingIndex].toolCalls?.length) {
                      // Start a new message after tool execution
                      assistantMessageId = generateUUID();
                      assistantContent = event.content;
                      return [
                        ...prev,
                        {
                          id: assistantMessageId,
                          role: 'assistant',
                          content: assistantContent,
                          createdAt: new Date().toISOString(),
                        },
                      ];
                    }

                    assistantContent += event.content;
                    if (!assistantMessageId) {
                      assistantMessageId = generateUUID();
                    }

                    if (existingIndex !== -1) {
                      // Update existing message
                      const updated = [...prev];
                      updated[existingIndex] = {
                        ...updated[existingIndex],
                        content: assistantContent,
                      };
                      return updated;
                    }
                    // Add new message
                    return [
                      ...prev,
                      {
                        id: assistantMessageId!,
                        role: 'assistant',
                        content: assistantContent,
                        createdAt: new Date().toISOString(),
                      },
                    ];
                  });
                  break;

                case 'tool_use': {
                  // Ensure we have an assistant message to attach tool calls to
                  if (!assistantMessageId) {
                    assistantMessageId = generateUUID();
                  }
                  const newToolCall: ToolCall = {
                    id: event.toolUseId,
                    name: event.toolName,
                    input: event.toolInput,
                    status: 'running',
                  };
                  setMessages((prev) => {
                    // Find existing assistant message by ID
                    const existingIndex = prev.findIndex((m) => m.id === assistantMessageId);
                    if (existingIndex !== -1) {
                      const existingToolCalls = prev[existingIndex].toolCalls || [];
                      const updated = [...prev];
                      updated[existingIndex] = {
                        ...updated[existingIndex],
                        toolCalls: [...existingToolCalls, newToolCall],
                      };
                      return updated;
                    }
                    // Add new message with tool call
                    return [
                      ...prev,
                      {
                        id: assistantMessageId!,
                        role: 'assistant',
                        content: assistantContent,
                        toolCalls: [newToolCall],
                        createdAt: new Date().toISOString(),
                      },
                    ];
                  });
                  break;
                }

                case 'tool_result': {
                  setMessages((prev) => {
                    return prev.map((msg) => {
                      if (msg.toolCalls) {
                        const updatedToolCalls = msg.toolCalls.map((tc) =>
                          tc.id === event.toolUseId
                            ? { ...tc, status: 'completed' as const, output: event.result }
                            : tc
                        );
                        return { ...msg, toolCalls: updatedToolCalls };
                      }
                      return msg;
                    });
                  });
                  // Reset for next message - new text after tool result should be a new message
                  assistantMessageId = null;
                  assistantContent = '';
                  break;
                }

                case 'tool_approval_request':
                  setPendingToolApproval(event.request);
                  // Add approval request as a message
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: event.request.requestId,
                      role: 'tool_approval',
                      content: '',
                      toolApproval: {
                        requestId: event.request.requestId,
                        toolName: event.request.toolName,
                        toolInput: event.request.toolInput,
                        isDangerous: event.request.isDangerous,
                      },
                      createdAt: new Date().toISOString(),
                    },
                  ]);
                  break;

                case 'tool_approval_resolved':
                  setPendingToolApproval(null);
                  break;

                case 'error':
                  setError(event.message);
                  break;

                case 'done': {
                  // Final result - add or update assistant message with the result
                  if (event.result) {
                    setMessages((prev) => {
                      // Check if we have an existing assistant message to update
                      const existingIndex = assistantMessageId
                        ? prev.findIndex((m) => m.id === assistantMessageId)
                        : -1;

                      // If existing message has toolCalls, create a new message
                      if (existingIndex !== -1 && prev[existingIndex].toolCalls?.length) {
                        const newId = generateUUID();
                        return [
                          ...prev,
                          {
                            id: newId,
                            role: 'assistant',
                            content: event.result,
                            createdAt: new Date().toISOString(),
                          },
                        ];
                      }

                      // If no existing message or no toolCalls, update or create
                      if (existingIndex !== -1) {
                        const updated = [...prev];
                        updated[existingIndex] = {
                          ...updated[existingIndex],
                          content: event.result,
                        };
                        return updated;
                      }

                      // No existing message, create new one
                      return [
                        ...prev,
                        {
                          id: generateUUID(),
                          role: 'assistant',
                          content: event.result,
                          createdAt: new Date().toISOString(),
                        },
                      ];
                    });
                  }
                  break;
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [session, queryClient]
  );

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  }, []);

  const respondToToolApproval = useCallback(async (response: ToolApprovalResponse) => {
    try {
      // Update the message with the decision
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === response.requestId && msg.toolApproval
            ? {
                ...msg,
                toolApproval: {
                  ...msg.toolApproval,
                  decision: response.decision,
                  decidedAt: new Date().toISOString(),
                },
              }
            : msg
        )
      );

      const res = await fetch('/api/chat/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to respond to tool approval');
      }
    } catch (err) {
      console.error('Failed to respond to tool approval:', err);
      setError(err instanceof Error ? err.message : 'Failed to respond to tool approval');
    }
  }, []);

  return {
    messages,
    isLoading,
    isGenerating,
    error,
    session,
    pendingToolApproval,
    sendMessage,
    stopGeneration,
    respondToToolApproval,
  };
}
