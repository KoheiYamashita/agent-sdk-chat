import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useSessions } from '../useSessions';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useSessions', () => {
  let queryClient: QueryClient;

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
  });

  afterEach(() => {
    queryClient.clear();
  });

  const mockSessions = [
    {
      id: 'session-1',
      title: 'Test Session 1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      messageCount: 5,
      isArchived: false,
      tagId: null,
      tagName: null,
    },
    {
      id: 'session-2',
      title: 'Test Session 2',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      messageCount: 3,
      isArchived: false,
      tagId: 'tag-1',
      tagName: 'Work',
    },
  ];

  describe('initial state', () => {
    it('should return initial loading state', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: [], total: 0, nextCursor: null }),
      });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.sessions).toEqual([]);
    });

    it('should provide required functions', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: [], total: 0, nextCursor: null }),
      });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.createSession).toBe('function');
      expect(typeof result.current.deleteSession).toBe('function');
      expect(typeof result.current.toggleArchive).toBe('function');
      expect(typeof result.current.setSessionTag).toBe('function');
      expect(typeof result.current.loadMore).toBe('function');
    });
  });

  describe('fetchSessions', () => {
    it('should fetch and return sessions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions, total: 2, nextCursor: null }),
      });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.total).toBe(2);
      expect(result.current.hasMore).toBe(false);
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should handle pagination with nextCursor', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            sessions: [mockSessions[0]],
            total: 2,
            nextCursor: 'cursor-1',
          }),
      });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const newSession = {
        id: 'session-3',
        title: 'New Session',
        claudeSessionId: 'claude-3',
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        isArchived: false,
        isProcessing: false,
        pendingToolApproval: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sessions: mockSessions, total: 2, nextCursor: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ session: newSession }),
        });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdSession;
      await act(async () => {
        createdSession = await result.current.createSession();
      });

      expect(createdSession).toEqual(newSession);
      expect(mockFetch).toHaveBeenCalledWith('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should return null on create error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sessions: [], total: 0, nextCursor: null }),
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdSession;
      await act(async () => {
        createdSession = await result.current.createSession();
      });

      expect(createdSession).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sessions: mockSessions, total: 2, nextCursor: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteSession('session-1');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/session-1', {
        method: 'DELETE',
      });
    });

    it('should throw on delete error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sessions: mockSessions, total: 2, nextCursor: null }),
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.deleteSession('session-1');
        })
      ).rejects.toThrow('Failed to delete session');
    });
  });

  describe('toggleArchive', () => {
    it('should toggle archive status', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sessions: mockSessions, total: 2, nextCursor: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              session: { ...mockSessions[0], isArchived: true },
            }),
        });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleArchive('session-1', false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/session-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true }),
      });
    });

    it('should throw on toggle error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sessions: mockSessions, total: 2, nextCursor: null }),
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.toggleArchive('session-1', false);
        })
      ).rejects.toThrow('Failed to toggle archive');
    });
  });

  describe('setSessionTag', () => {
    it('should set a tag on session', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sessions: mockSessions, total: 2, nextCursor: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              session: { ...mockSessions[0], tagId: 'tag-1', tagName: 'Work' },
            }),
        });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setSessionTag('session-1', 'tag-1');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/session-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId: 'tag-1' }),
      });
    });

    it('should clear tag when tagId is null', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ sessions: mockSessions, total: 2, nextCursor: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              session: { ...mockSessions[1], tagId: null, tagName: null },
            }),
        });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setSessionTag('session-2', null);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/session-2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId: null }),
      });
    });
  });

  describe('loadMore', () => {
    it('should load more when hasMore is true', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessions: [mockSessions[0]],
              total: 2,
              nextCursor: 'cursor-1',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sessions: [mockSessions[1]],
              total: 2,
              nextCursor: null,
            }),
        });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.hasMore).toBe(true);

      await act(async () => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(2);
      });
    });

    it('should not load more when hasMore is false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions, total: 2, nextCursor: null }),
      });

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);

      act(() => {
        result.current.loadMore();
      });

      // Should only have initial fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
