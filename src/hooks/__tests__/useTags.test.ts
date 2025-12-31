import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useTags } from '../useTags';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useTags', () => {
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

  const mockTags = [
    {
      id: 'tag-1',
      name: 'Work',
      sessionCount: 5,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'tag-2',
      name: 'Personal',
      sessionCount: 3,
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  ];

  describe('initial state', () => {
    it('should return initial loading state', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: [] }),
      });

      const { result } = renderHook(() => useTags(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.tags).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should provide required functions', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: [] }),
      });

      const { result } = renderHook(() => useTags(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.createTag).toBe('function');
      expect(typeof result.current.updateTag).toBe('function');
      expect(typeof result.current.deleteTag).toBe('function');
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('fetchTags', () => {
    it('should fetch and return tags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockTags }),
      });

      const { result } = renderHook(() => useTags(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tags).toHaveLength(2);
      expect(result.current.tags[0].name).toBe('Work');
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useTags(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch tags');
    });
  });

  describe('createTag', () => {
    it('should create a new tag', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: mockTags }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'tag-3',
              name: 'New Tag',
              sessionCount: 0,
              createdAt: '2024-01-03T00:00:00.000Z',
              updatedAt: '2024-01-03T00:00:00.000Z',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: [...mockTags] }),
        });

      const { result } = renderHook(() => useTags(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createTag({ name: 'New Tag' });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Tag' }),
      });
    });

    it('should handle create error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Tag already exists' }),
        });

      const { result } = renderHook(() => useTags(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.createTag({ name: 'Duplicate' });
        })
      ).rejects.toThrow('Tag already exists');
    });

    it('should set isCreating during mutation', async () => {
      let resolveCreate: (value: unknown) => void;
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: [] }),
        })
        .mockImplementationOnce(() => createPromise);

      const { result } = renderHook(() => useTags(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.createTag({ name: 'Test' });
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(true);
      });

      await act(async () => {
        resolveCreate!({
          ok: true,
          json: () => Promise.resolve({ id: 'new', name: 'Test', sessionCount: 0 }),
        });
      });
    });
  });

  describe('updateTag', () => {
    it('should update a tag', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: mockTags }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'tag-1',
              name: 'Updated Work',
              sessionCount: 5,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: mockTags }),
        });

      const { result } = renderHook(() => useTags(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateTag('tag-1', { name: 'Updated Work' });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/tags/tag-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Work' }),
      });
    });

    it('should handle update error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: mockTags }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Update failed' }),
        });

      const { result } = renderHook(() => useTags(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.updateTag('tag-1', { name: 'New Name' });
        })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: mockTags }),
        })
        .mockResolvedValueOnce({
          ok: true,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: [mockTags[1]] }),
        });

      const { result } = renderHook(() => useTags(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteTag('tag-1');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/tags/tag-1', {
        method: 'DELETE',
      });
    });

    it('should handle delete error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: mockTags }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Cannot delete tag with sessions' }),
        });

      const { result } = renderHook(() => useTags(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.deleteTag('tag-1');
        })
      ).rejects.toThrow('Cannot delete tag with sessions');
    });
  });

  describe('refetch', () => {
    it('should refetch tags', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: mockTags }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              tags: [...mockTags, { id: 'tag-3', name: 'New', sessionCount: 0 }],
            }),
        });

      const { result } = renderHook(() => useTags(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tags).toHaveLength(2);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.tags).toHaveLength(3);
      });
    });
  });
});
