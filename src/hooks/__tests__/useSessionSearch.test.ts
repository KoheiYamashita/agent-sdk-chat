import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSessionSearch } from '../useSessionSearch';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useSessionSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockSearchResults = [
    {
      id: 'session-1',
      title: 'Test Session 1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      messageCount: 5,
      matchedContent: 'This is a test match',
      matchType: 'title' as const,
    },
    {
      id: 'session-2',
      title: 'Another Session',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      messageCount: 3,
      matchedContent: 'Another test match',
      matchType: 'content' as const,
    },
  ];

  describe('initial state', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useSessionSearch());

      expect(result.current.query).toBe('');
      expect(result.current.results).toBeNull();
      expect(result.current.isSearching).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should provide required functions', () => {
      const { result } = renderHook(() => useSessionSearch());

      expect(typeof result.current.setQuery).toBe('function');
      expect(typeof result.current.clearSearch).toBe('function');
    });
  });

  describe('setQuery', () => {
    it('should update query', () => {
      const { result } = renderHook(() => useSessionSearch());

      act(() => {
        result.current.setQuery('test');
      });

      expect(result.current.query).toBe('test');
    });

    it('should clear results when query is empty', async () => {
      const { result } = renderHook(() => useSessionSearch());

      act(() => {
        result.current.setQuery('');
      });

      expect(result.current.results).toBeNull();
    });

    it('should clear results when query is only whitespace', async () => {
      const { result } = renderHook(() => useSessionSearch());

      act(() => {
        result.current.setQuery('   ');
      });

      expect(result.current.results).toBeNull();
    });
  });

  describe('search functionality', () => {
    it('should fetch search results after debounce', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSearchResults }),
      });

      const { result } = renderHook(() => useSessionSearch());

      act(() => {
        result.current.setQuery('test');
      });

      // Wait for debounce and fetch
      await waitFor(
        () => {
          expect(result.current.results).not.toBeNull();
        },
        { timeout: 1000 }
      );

      expect(result.current.results).toHaveLength(2);
      expect(result.current.results?.[0].title).toBe('Test Session 1');
      expect(mockFetch).toHaveBeenCalledWith('/api/search/sessions?q=test');
    });

    it('should set isSearching while fetching', async () => {
      let resolveSearch: (value: unknown) => void;
      const searchPromise = new Promise((resolve) => {
        resolveSearch = resolve;
      });

      mockFetch.mockImplementationOnce(() => searchPromise);

      const { result } = renderHook(() => useSessionSearch());

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(
        () => {
          expect(result.current.isSearching).toBe(true);
        },
        { timeout: 500 }
      );

      await act(async () => {
        resolveSearch!({
          ok: true,
          json: () => Promise.resolve({ sessions: [] }),
        });
      });

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useSessionSearch());

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(
        () => {
          expect(result.current.error).not.toBeNull();
        },
        { timeout: 1000 }
      );

      expect(result.current.error?.message).toBe('Failed to search sessions');
      expect(result.current.results).toBeNull();
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSessionSearch());

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(
        () => {
          expect(result.current.error).not.toBeNull();
        },
        { timeout: 1000 }
      );

      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('clearSearch', () => {
    it('should reset all state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSearchResults }),
      });

      const { result } = renderHook(() => useSessionSearch());

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(
        () => {
          expect(result.current.results).not.toBeNull();
        },
        { timeout: 1000 }
      );

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.query).toBe('');
      expect(result.current.results).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
