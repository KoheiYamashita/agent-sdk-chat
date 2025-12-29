'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Message,
  ChatEvent,
  Session,
  SessionDetailResponse,
  MessageListResponse,
  PermissionMode,
  ToolApprovalRequest,
  ToolApprovalResponse,
  ToolCall,
} from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

interface UseChatOptions {
  sessionId?: string;
  resetKey?: number;
}

interface SendMessageOptions {
  permissionMode?: PermissionMode;
  workspacePath?: string;
  workspaceDisplayPath?: string;
  thinkingEnabled?: boolean;
  model?: string;
  modelDisplayName?: string;
  systemPrompt?: string;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  session: Session | null;
  pendingToolApproval: ToolApprovalRequest | null;
  hasMoreMessages: boolean;
  isLoadingMoreMessages: boolean;
  streamingThinking: string | null;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;
  stopGeneration: () => void;
  respondToToolApproval: (response: ToolApprovalResponse) => Promise<void>;
}

async function fetchMessages(
  sessionId: string,
  cursor?: string
): Promise<MessageListResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);

  const response = await fetch(
    `/api/sessions/${sessionId}/messages?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }
  return response.json();
}

export function useChat({ sessionId, resetKey = 0 }: UseChatOptions = {}): UseChatReturn {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [pendingToolApproval, setPendingToolApproval] =
    useState<ToolApprovalRequest | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [streamingThinking, setStreamingThinking] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastResetKeyRef = useRef(resetKey);

  // Reset all state when resetKey changes (triggered by "New Chat" button)
  useEffect(() => {
    if (resetKey !== lastResetKeyRef.current) {
      lastResetKeyRef.current = resetKey;
      // Abort any ongoing generation
      abortControllerRef.current?.abort();
      // Reset all state
      setMessages([]);
      setIsGenerating(false);
      setError(null);
      setSession(null);
      setPendingToolApproval(null);
      setHasMoreMessages(false);
      setNextCursor(null);
      setStreamingThinking(null);
    }
  }, [resetKey]);

  // Fetch session info only
  const { data: sessionData, isLoading: isLoadingSession } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async (): Promise<SessionDetailResponse> => {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      return response.json();
    },
    enabled: !!sessionId,
    staleTime: 0,
  });

  // Fetch initial messages (last N messages)
  const { isLoading: isLoadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', sessionId],
    queryFn: async (): Promise<MessageListResponse> => {
      const response = await fetchMessages(sessionId!);
      return response;
    },
    enabled: !!sessionId,
    staleTime: 0,
  });

  // Load session data when query completes or sessionId changes
  useEffect(() => {
    if (sessionData) {
      setSession(sessionData.session);
      // Restore runtime state from server memory
      if (sessionData.session.isProcessing) {
        setIsGenerating(true);
      }
      if (sessionData.session.pendingToolApproval) {
        setPendingToolApproval(sessionData.session.pendingToolApproval);
      }
    } else if (!sessionId) {
      setSession(null);
      setMessages([]);
      setHasMoreMessages(false);
      setNextCursor(null);
    }
  }, [sessionId, sessionData]);

  // Load initial messages when the query completes
  useEffect(() => {
    const queryData = queryClient.getQueryData<MessageListResponse>([
      'messages',
      sessionId,
    ]);
    if (queryData) {
      setMessages(queryData.messages);
      setHasMoreMessages(queryData.hasMore);
      setNextCursor(queryData.nextCursor);
    }
  }, [sessionId, queryClient, isLoadingMessages]);

  // Load more (older) messages
  const loadMoreMessages = useCallback(async () => {
    if (!sessionId || !nextCursor || isLoadingMoreMessages) return;

    setIsLoadingMoreMessages(true);
    try {
      const response = await fetchMessages(sessionId, nextCursor);
      setMessages((prev) => [...response.messages, ...prev]);
      setHasMoreMessages(response.hasMore);
      setNextCursor(response.nextCursor);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setIsLoadingMoreMessages(false);
    }
  }, [sessionId, nextCursor, isLoadingMoreMessages]);

  // Poll for processing state when reconnected (no active SSE stream)
  useEffect(() => {
    // Only poll when:
    // - isGenerating is true (UI shows processing)
    // - No active SSE stream (abortControllerRef.current is null)
    // - Session exists
    if (!isGenerating || abortControllerRef.current || !session?.id) {
      return;
    }

    const POLL_INTERVAL_MS = 2000;
    const MAX_CONSECUTIVE_ERRORS = 10;
    const POLL_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes (fixed)

    let errorCount = 0;
    const startTime = Date.now();

    const pollInterval = setInterval(async () => {
      // Check for timeout (60 minutes)
      if (Date.now() - startTime > POLL_TIMEOUT_MS) {
        console.warn('[useChat] Polling timeout after 60 minutes, stopping');
        setIsGenerating(false);
        setError('Processing timed out. Please refresh the page.');
        return;
      }

      try {
        const res = await fetch(`/api/sessions/${session.id}`);
        if (res.ok) {
          errorCount = 0; // Reset error count on success
          const data = (await res.json()) as { session: { isProcessing?: boolean; pendingToolApproval?: ToolApprovalRequest | null } };
          if (!data.session.isProcessing) {
            // Processing completed, update UI
            setIsGenerating(false);
            // Also update pending approval if it was resolved
            if (!data.session.pendingToolApproval) {
              setPendingToolApproval(null);
            }
            // Refresh messages via React Query refetch - use result directly
            const result = await refetchMessages();
            if (result.data) {
              setMessages(result.data.messages);
              setHasMoreMessages(result.data.hasMore);
              setNextCursor(result.data.nextCursor);
            }
          }
        } else {
          errorCount++;
          console.error(`[useChat] Poll failed with status ${res.status}, error count: ${errorCount}`);
        }
      } catch (err) {
        errorCount++;
        console.error(`[useChat] Failed to poll session state (${errorCount}/${MAX_CONSECUTIVE_ERRORS}):`, err);
      }

      // Stop polling after max consecutive errors
      if (errorCount >= MAX_CONSECUTIVE_ERRORS) {
        console.error('[useChat] Max consecutive errors reached, stopping polling');
        setIsGenerating(false);
        setError('Connection lost. Please refresh the page.');
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollInterval);
  }, [isGenerating, session?.id, refetchMessages]);

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

        const settings: {
          permissionMode?: PermissionMode;
          workspacePath?: string;
          workspaceDisplayPath?: string;
          thinkingEnabled?: boolean;
          model?: string;
          modelDisplayName?: string;
          systemPrompt?: string;
        } = {};
        if (options?.permissionMode) {
          settings.permissionMode = options.permissionMode;
        }
        if (options?.workspacePath) {
          settings.workspacePath = options.workspacePath;
        }
        if (options?.workspaceDisplayPath) {
          settings.workspaceDisplayPath = options.workspaceDisplayPath;
        }
        if (options?.model) {
          settings.model = options.model;
        }
        if (options?.modelDisplayName) {
          settings.modelDisplayName = options.modelDisplayName;
        }
        if (options?.systemPrompt) {
          settings.systemPrompt = options.systemPrompt;
        }
        if (options?.thinkingEnabled !== undefined) {
          settings.thinkingEnabled = options.thinkingEnabled;
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            sessionId: session?.id,
            settings: Object.keys(settings).length > 0 ? settings : undefined,
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
        let currentModel: string | undefined;
        let thinkingContent = '';

        // Reset streaming thinking at start
        setStreamingThinking(null);

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
                  currentModel = event.model;
                  if (!session) {
                    const sessionSettings = options?.workspacePath
                      ? {
                          workspacePath: options.workspacePath,
                          workspaceDisplayPath: options.workspaceDisplayPath,
                        }
                      : null;
                    setSession({
                      id: event.sessionId,
                      title: content.slice(0, 50),
                      claudeSessionId: event.claudeSessionId,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      settings: sessionSettings,
                      isArchived: false,
                    });
                    queryClient.invalidateQueries({ queryKey: ['sessions'] });
                  }
                  break;

                case 'text_delta': {
                  // Streaming text delta - update message in real-time
                  // Update content OUTSIDE setMessages to avoid React strict mode double-execution
                  const needsNewMessage =
                    assistantMessageId &&
                    messages.find(
                      (m) => m.id === assistantMessageId && m.toolCalls?.length
                    );

                  if (needsNewMessage) {
                    assistantMessageId = generateUUID();
                    assistantContent = event.delta;
                  } else {
                    assistantContent += event.delta;
                    if (!assistantMessageId) {
                      assistantMessageId = generateUUID();
                    }
                  }

                  const currentContent = assistantContent;
                  const currentId = assistantMessageId;
                  const modelForMessage = currentModel;
                  const modelDisplayNameForMessage = options?.modelDisplayName;

                  setMessages((prev) => {
                    const existingIndex = prev.findIndex(
                      (m) => m.id === currentId
                    );

                    if (existingIndex !== -1) {
                      const updated = [...prev];
                      updated[existingIndex] = {
                        ...updated[existingIndex],
                        content: currentContent,
                      };
                      return updated;
                    }
                    return [
                      ...prev,
                      {
                        id: currentId!,
                        role: 'assistant',
                        content: currentContent,
                        model: modelForMessage,
                        modelDisplayName: modelDisplayNameForMessage,
                        createdAt: new Date().toISOString(),
                      },
                    ];
                  });
                  break;
                }

                case 'thinking_delta': {
                  // Accumulate thinking content and update streaming state
                  thinkingContent += event.delta;
                  setStreamingThinking(thinkingContent);
                  break;
                }

                case 'message':
                  setMessages((prev) => {
                    // Find existing assistant message by ID
                    const existingIndex = assistantMessageId
                      ? prev.findIndex((m) => m.id === assistantMessageId)
                      : -1;

                    // If existing message has toolCalls, create a new message instead
                    // (this means tool execution happened and we should start fresh)
                    if (
                      existingIndex !== -1 &&
                      prev[existingIndex].toolCalls?.length
                    ) {
                      // Start a new message after tool execution
                      assistantMessageId = generateUUID();
                      assistantContent = event.content;
                      return [
                        ...prev,
                        {
                          id: assistantMessageId,
                          role: 'assistant',
                          content: assistantContent,
                          model: currentModel,
                          modelDisplayName: options?.modelDisplayName,
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
                        model: currentModel,
                        modelDisplayName: options?.modelDisplayName,
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
                    const existingIndex = prev.findIndex(
                      (m) => m.id === assistantMessageId
                    );
                    if (existingIndex !== -1) {
                      const existingToolCalls =
                        prev[existingIndex].toolCalls || [];
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
                        model: currentModel,
                        modelDisplayName: options?.modelDisplayName,
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
                            ? {
                                ...tc,
                                status: 'completed' as const,
                                output: event.result,
                              }
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
                  // Update the message with the decision (including interrupt)
                  if (event.decision) {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === event.requestId && msg.toolApproval
                          ? {
                              ...msg,
                              toolApproval: {
                                ...msg.toolApproval,
                                decision: event.decision,
                                decidedAt: new Date().toISOString(),
                              },
                            }
                          : msg
                      )
                    );
                  }
                  break;

                case 'error':
                  setError(event.message);
                  break;

                case 'done': {
                  // Final result - add or update assistant message with the result
                  // Use thinkingContent from event if available (from DB), otherwise use accumulated content
                  const finalThinkingContent = event.thinkingContent || thinkingContent || undefined;

                  // Clear streaming thinking state
                  setStreamingThinking(null);

                  if (event.result) {
                    const messageModel = event.model;
                    const messageModelDisplayName = event.modelDisplayName;
                    setMessages((prev) => {
                      // Check if we have an existing assistant message to update
                      const existingIndex = assistantMessageId
                        ? prev.findIndex((m) => m.id === assistantMessageId)
                        : -1;

                      // If existing message has toolCalls, create a new message
                      if (
                        existingIndex !== -1 &&
                        prev[existingIndex].toolCalls?.length
                      ) {
                        const newId = generateUUID();
                        return [
                          ...prev,
                          {
                            id: newId,
                            role: 'assistant',
                            content: event.result,
                            model: messageModel,
                            modelDisplayName: messageModelDisplayName,
                            thinkingContent: finalThinkingContent,
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
                          model: messageModel,
                          modelDisplayName: messageModelDisplayName,
                          thinkingContent: finalThinkingContent,
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
                          model: messageModel,
                          modelDisplayName: messageModelDisplayName,
                          thinkingContent: finalThinkingContent,
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

  const stopGeneration = useCallback(async () => {
    if (!session?.id) {
      // No session, just abort the fetch
      abortControllerRef.current?.abort();
      return;
    }

    try {
      // Request backend to interrupt the SDK query
      const response = await fetch('/api/chat/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (!response.ok) {
        // Interrupt failed - fallback to aborting the fetch connection
        console.error('Failed to abort:', await response.text());
        abortControllerRef.current?.abort();
      } else {
        // Handle interrupted approvals
        const data = await response.json() as { interruptedApprovalIds?: string[] };
        if (data.interruptedApprovalIds && data.interruptedApprovalIds.length > 0) {
          // Update messages with interrupt decision
          setMessages((prev) =>
            prev.map((msg) =>
              data.interruptedApprovalIds!.includes(msg.id) && msg.toolApproval
                ? {
                    ...msg,
                    toolApproval: {
                      ...msg.toolApproval,
                      decision: 'interrupt' as const,
                      decidedAt: new Date().toISOString(),
                    },
                  }
                : msg
            )
          );
          // Clear pending approval if any
          setPendingToolApproval(null);
        }
      }
      // On success: SDK's interrupt() will stop the query and stream will end normally
      // isGenerating will be updated automatically when the SSE stream closes
    } catch (err) {
      // Network error - fallback to aborting the fetch connection
      console.error('Failed to abort:', err);
      abortControllerRef.current?.abort();
    }
  }, [session?.id]);

  const respondToToolApproval = useCallback(
    async (response: ToolApprovalResponse) => {
      // Check if this is a reconnected state (no active SSE stream)
      const isReconnected = !abortControllerRef.current;

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
          throw new Error(
            errorData.error || 'Failed to respond to tool approval'
          );
        }

        // Clear pending approval only when reconnected (no SSE stream)
        // Normal case: SSE event tool_approval_resolved will clear it
        if (isReconnected) {
          setPendingToolApproval(null);
        }
      } catch (err) {
        console.error('Failed to respond to tool approval:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to respond to tool approval'
        );
      }
    },
    []
  );

  return {
    messages,
    isLoading: isLoadingSession || isLoadingMessages,
    isGenerating,
    error,
    session,
    pendingToolApproval,
    hasMoreMessages,
    isLoadingMoreMessages,
    streamingThinking,
    loadMoreMessages,
    sendMessage,
    stopGeneration,
    respondToToolApproval,
  };
}
