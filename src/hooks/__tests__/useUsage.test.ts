import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useUsage } from '../useUsage';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useUsage', () => {
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

  const mockUsageData = {
    totalSessions: 10,
    totalMessages: 150,
    totalInputTokens: 50000,
    totalOutputTokens: 25000,
    estimatedCost: 1.23,
  };

  describe('initial state', () => {
    it('should return initial loading state', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      });

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.usage).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should provide refetch function', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      });

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('fetchUsage', () => {
    it('should fetch and return usage data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockUsageData }),
      });

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.usage).toEqual(mockUsageData);
      expect(result.current.error).toBeNull();
    });

    it('should return null usage when data is undefined', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.usage).toBeNull();
    });

    it('should handle fetch error with message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'API key required' }),
      });

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('API key required');
      expect(result.current.usage).toBeNull();
    });

    it('should handle fetch error without message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch usage');
    });
  });

  describe('refetch', () => {
    it('should refetch usage data', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockUsageData }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: { ...mockUsageData, totalSessions: 15 },
            }),
        });

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.usage?.totalSessions).toBe(10);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.usage?.totalSessions).toBe(15);
      });
    });
  });
});
