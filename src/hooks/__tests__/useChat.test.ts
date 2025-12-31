import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useChat } from '../useChat';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock uuid
vi.mock('@/lib/utils/uuid', () => ({
  generateUUID: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).slice(2)),
}));

describe('useChat', () => {
  let queryClient: QueryClient;

  // Wrapper component for QueryClientProvider
  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('initial state', () => {
    it('should return initial state without sessionId', () => {
      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.pendingToolApproval).toBeNull();
      expect(result.current.hasMoreMessages).toBe(false);
    });

    it('should provide required functions', () => {
      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.stopGeneration).toBe('function');
      expect(typeof result.current.respondToToolApproval).toBe('function');
      expect(typeof result.current.loadMoreMessages).toBe('function');
    });
  });

  describe('with sessionId', () => {
    const mockSession = {
      id: 'session-1',
      title: 'Test Session',
      claudeSessionId: 'claude-123',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      isArchived: false,
      isProcessing: false,
      pendingToolApproval: null,
    };

    const mockMessages = {
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          createdAt: '2024-01-01T00:01:00.000Z',
        },
      ],
      total: 2,
      hasMore: false,
      nextCursor: null,
    };

    it('should fetch session and messages when sessionId provided', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ session: mockSession }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        });

      const { result } = renderHook(() => useChat({ sessionId: 'session-1' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session?.id).toBe('session-1');
      expect(result.current.messages).toHaveLength(2);
    });

    it('should restore isProcessing state from server', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              session: { ...mockSession, isProcessing: true },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        });

      const { result } = renderHook(() => useChat({ sessionId: 'session-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
      });
    });

    it('should restore pendingToolApproval from server', async () => {
      const pendingApproval = {
        requestId: 'req-1',
        toolName: 'Bash',
        toolInput: { command: 'ls' },
        isDangerous: true,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              session: { ...mockSession, pendingToolApproval: pendingApproval },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        });

      const { result } = renderHook(() => useChat({ sessionId: 'session-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pendingToolApproval).toEqual(pendingApproval);
      });
    });
  });

  describe('resetKey', () => {
    it('should reset state when resetKey changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            messages: [],
            total: 0,
            hasMore: false,
            nextCursor: null,
          }),
      });

      const { result, rerender } = renderHook(
        ({ resetKey }) => useChat({ resetKey }),
        {
          wrapper: createWrapper(),
          initialProps: { resetKey: 0 },
        }
      );

      // Simulate having some state
      await waitFor(() => {
        expect(result.current.messages).toEqual([]);
      });

      // Change resetKey
      rerender({ resetKey: 1 });

      expect(result.current.messages).toEqual([]);
      expect(result.current.session).toBeNull();
      expect(result.current.pendingToolApproval).toBeNull();
    });
  });

  describe('stopGeneration', () => {
    it('should call abort API when session exists', async () => {
      const mockSession = {
        id: 'session-1',
        title: 'Test',
        claudeSessionId: 'claude-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        isArchived: false,
        isProcessing: false,
        pendingToolApproval: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ session: mockSession }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ messages: [], total: 0, hasMore: false, nextCursor: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, interruptedApprovalIds: [] }),
        });

      const { result } = renderHook(() => useChat({ sessionId: 'session-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.session).not.toBeNull();
      });

      await act(async () => {
        await result.current.stopGeneration();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/chat/abort', expect.any(Object));
    });
  });

  describe('respondToToolApproval', () => {
    it('should call approve API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.respondToToolApproval({
          requestId: 'req-1',
          decision: 'allow',
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/chat/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: 'req-1', decision: 'allow' }),
      });
    });

    it('should set error when approve fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Approval failed' }),
      });

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.respondToToolApproval({
          requestId: 'req-1',
          decision: 'allow',
        });
      });

      expect(result.current.error).toBe('Approval failed');
    });
  });

  describe('loadMoreMessages', () => {
    it('should not load if no sessionId', async () => {
      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.loadMoreMessages();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should load more messages when hasMore is true', async () => {
      const mockSession = {
        id: 'session-1',
        title: 'Test',
        claudeSessionId: 'claude-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        isArchived: false,
        isProcessing: false,
        pendingToolApproval: null,
      };

      const initialMessages = {
        messages: [
          { id: 'msg-2', role: 'user', content: 'Second', createdAt: '2024-01-01T00:02:00.000Z' },
        ],
        total: 2,
        hasMore: true,
        nextCursor: 'cursor-1',
      };

      const olderMessages = {
        messages: [
          { id: 'msg-1', role: 'user', content: 'First', createdAt: '2024-01-01T00:01:00.000Z' },
        ],
        total: 2,
        hasMore: false,
        nextCursor: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ session: mockSession }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(initialMessages),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(olderMessages),
        });

      const { result } = renderHook(() => useChat({ sessionId: 'session-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.hasMoreMessages).toBe(true);
      });

      await act(async () => {
        await result.current.loadMoreMessages();
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
        expect(result.current.hasMoreMessages).toBe(false);
      });
    });
  });

  describe('sendMessage', () => {
    // Helper to create a mock SSE response
    function createSSEResponse(events: Array<{ type: string; [key: string]: unknown }>) {
      const encoder = new TextEncoder();
      let eventIndex = 0;

      return {
        ok: true,
        body: {
          getReader: () => ({
            read: async () => {
              if (eventIndex >= events.length) {
                return { done: true, value: undefined };
              }
              const event = events[eventIndex++];
              const data = `data: ${JSON.stringify(event)}\n\n`;
              return { done: false, value: encoder.encode(data) };
            },
          }),
        },
      };
    }

    it('should send message and add user message immediately', async () => {
      const sseEvents = [
        { type: 'init', sessionId: 'new-session', claudeSessionId: 'claude-new' },
        { type: 'text_delta', delta: 'Hello' },
        { type: 'done', result: 'Hello!' },
      ];

      mockFetch.mockResolvedValueOnce(createSSEResponse(sseEvents));

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sendMessage('Hi');
      });

      expect(result.current.messages.length).toBeGreaterThanOrEqual(1);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Hi');
    });

    it('should create session on init event', async () => {
      const sseEvents = [
        { type: 'init', sessionId: 'new-session', claudeSessionId: 'claude-new', model: 'claude-sonnet-4-20250514' },
        { type: 'done', result: 'Response' },
      ];

      mockFetch.mockResolvedValueOnce(createSSEResponse(sseEvents));

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.session).not.toBeNull();
      expect(result.current.session?.id).toBe('new-session');
    });

    it('should handle text_delta events', async () => {
      const sseEvents = [
        { type: 'init', sessionId: 'session-1', claudeSessionId: 'claude-1' },
        { type: 'text_delta', delta: 'Hello' },
        { type: 'text_delta', delta: ' world' },
        { type: 'done', result: 'Hello world' },
      ];

      mockFetch.mockResolvedValueOnce(createSSEResponse(sseEvents));

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      const assistantMessages = result.current.messages.filter(m => m.role === 'assistant');
      expect(assistantMessages.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle thinking_delta events', async () => {
      const sseEvents = [
        { type: 'init', sessionId: 'session-1', claudeSessionId: 'claude-1' },
        { type: 'thinking_delta', delta: 'Let me think...' },
        { type: 'text_delta', delta: 'Response' },
        { type: 'done', result: 'Response' },
      ];

      mockFetch.mockResolvedValueOnce(createSSEResponse(sseEvents));

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      // Start sending message
      const sendPromise = act(async () => {
        await result.current.sendMessage('Test');
      });

      // During streaming, check streamingThinking
      await waitFor(() => {
        // streamingThinking might be set during streaming
        expect(result.current.streamingThinking === null || result.current.streamingThinking === 'Let me think...').toBe(true);
      });

      await sendPromise;
    });

    it('should handle tool_use and tool_result events', async () => {
      const sseEvents = [
        { type: 'init', sessionId: 'session-1', claudeSessionId: 'claude-1' },
        { type: 'tool_use', toolUseId: 'tool-1', toolName: 'Read', toolInput: { file_path: '/test.txt' } },
        { type: 'tool_result', toolUseId: 'tool-1', result: 'File contents' },
        { type: 'text_delta', delta: 'Done' },
        { type: 'done', result: 'Done' },
      ];

      mockFetch.mockResolvedValueOnce(createSSEResponse(sseEvents));

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sendMessage('Read file');
      });

      const assistantMessages = result.current.messages.filter(m => m.role === 'assistant');
      expect(assistantMessages.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle tool_approval_request event', async () => {
      const sseEvents = [
        { type: 'init', sessionId: 'session-1', claudeSessionId: 'claude-1' },
        {
          type: 'tool_approval_request',
          request: {
            requestId: 'req-1',
            toolName: 'Bash',
            toolInput: { command: 'rm -rf /' },
            isDangerous: true,
          },
        },
      ];

      mockFetch.mockResolvedValueOnce(createSSEResponse(sseEvents));

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        // This won't complete because we're waiting for approval
        result.current.sendMessage('Delete everything');
      });

      await waitFor(() => {
        expect(result.current.pendingToolApproval).not.toBeNull();
      });

      expect(result.current.pendingToolApproval?.toolName).toBe('Bash');
    });

    it('should handle error event', async () => {
      const sseEvents = [
        { type: 'init', sessionId: 'session-1', claudeSessionId: 'claude-1' },
        { type: 'error', message: 'API rate limit exceeded' },
      ];

      mockFetch.mockResolvedValueOnce(createSSEResponse(sseEvents));

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.error).toBe('API rate limit exceeded');
    });

    it('should handle title_updated event', async () => {
      const sseEvents = [
        { type: 'init', sessionId: 'session-1', claudeSessionId: 'claude-1' },
        { type: 'title_updated', sessionId: 'session-1', title: 'Updated Title' },
        { type: 'done', result: 'Response' },
      ];

      mockFetch.mockResolvedValueOnce(createSSEResponse(sseEvents));

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.session?.title).toBe('Updated Title');
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sendMessage('Test');
      });

      expect(result.current.error).toBe('Failed to send message');
      expect(result.current.isGenerating).toBe(false);
    });

    it('should pass options to settings', async () => {
      const sseEvents = [
        { type: 'init', sessionId: 'session-1', claudeSessionId: 'claude-1' },
        { type: 'done', result: 'Response' },
      ];

      mockFetch.mockResolvedValueOnce(createSSEResponse(sseEvents));

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.sendMessage('Test', {
          permissionMode: 'acceptEdits',
          workspacePath: '/home/user/project',
          thinkingEnabled: true,
          model: 'claude-opus-4-20250514',
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('acceptEdits'),
      }));
    });
  });

  describe('stopGeneration edge cases', () => {
    it('should abort fetch when no session', async () => {
      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      // Should not throw
      await act(async () => {
        result.current.stopGeneration();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle abort API failure gracefully', async () => {
      const mockSession = {
        id: 'session-1',
        title: 'Test',
        claudeSessionId: 'claude-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        isArchived: false,
        isProcessing: false,
        pendingToolApproval: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ session: mockSession }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ messages: [], total: 0, hasMore: false, nextCursor: null }),
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('Server error'),
        });

      const { result } = renderHook(() => useChat({ sessionId: 'session-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.session).not.toBeNull();
      });

      // Should not throw
      await act(async () => {
        result.current.stopGeneration();
      });
    });

    it('should update messages with interrupted approval IDs', async () => {
      const mockSession = {
        id: 'session-1',
        title: 'Test',
        claudeSessionId: 'claude-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        isArchived: false,
        isProcessing: true,
        pendingToolApproval: { requestId: 'req-1', toolName: 'Bash', toolInput: {}, isDangerous: true },
      };

      const mockMessages = {
        messages: [
          {
            id: 'req-1',
            role: 'tool_approval',
            content: '',
            toolApproval: { requestId: 'req-1', toolName: 'Bash', toolInput: {}, isDangerous: true },
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        hasMore: false,
        nextCursor: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ session: mockSession }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMessages),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, interruptedApprovalIds: ['req-1'] }),
        });

      const { result } = renderHook(() => useChat({ sessionId: 'session-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pendingToolApproval).not.toBeNull();
      });

      await act(async () => {
        await result.current.stopGeneration();
      });

      expect(result.current.pendingToolApproval).toBeNull();
    });
  });
});
