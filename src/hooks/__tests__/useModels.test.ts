import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useAllModels, useSupportedModels, useCustomModels } from '../useModels';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useModels', () => {
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

  const mockStandardModels = [
    {
      id: 'claude-sonnet-4-20250514',
      displayName: 'Claude Sonnet 4',
      description: 'Fast and efficient',
    },
    {
      id: 'claude-opus-4-20250514',
      displayName: 'Claude Opus 4',
      description: 'Most capable',
    },
  ];

  const mockCustomModels = [
    {
      id: 'custom-1',
      displayName: 'My Custom Model',
      description: 'Custom model for testing',
      baseModel: 'claude-sonnet-4-20250514',
      systemPrompt: 'You are helpful',
      icon: 'star',
      iconColor: '#ff0000',
      iconImageUrl: null,
      skillSettings: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  describe('useAllModels', () => {
    it('should return initial loading state', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ standardModels: [], customModels: [] }),
      });

      const { result } = renderHook(() => useAllModels(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.standardModels).toEqual([]);
      expect(result.current.customModels).toEqual([]);
      expect(result.current.selectableModels).toEqual([]);
    });

    it('should fetch and return all models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            standardModels: mockStandardModels,
            customModels: mockCustomModels,
          }),
      });

      const { result } = renderHook(() => useAllModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.standardModels).toHaveLength(2);
      expect(result.current.customModels).toHaveLength(1);
      expect(result.current.selectableModels).toHaveLength(3);
    });

    it('should convert models to selectable format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            standardModels: mockStandardModels,
            customModels: mockCustomModels,
          }),
      });

      const { result } = renderHook(() => useAllModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const standardSelectable = result.current.selectableModels.find(
        (m) => m.id === 'claude-sonnet-4-20250514'
      );
      expect(standardSelectable?.type).toBe('standard');
      expect(standardSelectable?.displayName).toBe('Claude Sonnet 4');

      const customSelectable = result.current.selectableModels.find(
        (m) => m.id === 'custom-1'
      );
      expect(customSelectable?.type).toBe('custom');
      expect(customSelectable?.displayName).toBe('My Custom Model');
      expect(customSelectable?.systemPrompt).toBe('You are helpful');
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useAllModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch models');
    });
  });

  describe('useSupportedModels', () => {
    it('should return initial loading state', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      const { result } = renderHook(() => useSupportedModels(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.models).toEqual([]);
    });

    it('should fetch and return supported models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: mockStandardModels }),
      });

      const { result } = renderHook(() => useSupportedModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.models).toHaveLength(2);
      expect(result.current.models[0].displayName).toBe('Claude Sonnet 4');
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useSupportedModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch supported models');
    });
  });

  describe('useCustomModels', () => {
    it('should return initial loading state', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      const { result } = renderHook(() => useCustomModels(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.models).toEqual([]);
    });

    it('should fetch and return custom models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: mockCustomModels }),
      });

      const { result } = renderHook(() => useCustomModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.models).toHaveLength(1);
      expect(result.current.models[0].displayName).toBe('My Custom Model');
    });

    it('should provide required functions', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      const { result } = renderHook(() => useCustomModels(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.createModel).toBe('function');
      expect(typeof result.current.updateModel).toBe('function');
      expect(typeof result.current.deleteModel).toBe('function');
      expect(typeof result.current.refetch).toBe('function');
    });

    describe('createModel', () => {
      it('should create a new custom model', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 'new-model',
                displayName: 'New Model',
                baseModel: 'claude-sonnet-4-20250514',
                systemPrompt: 'Hello',
              }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });

        const { result } = renderHook(() => useCustomModels(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.createModel({
            displayName: 'New Model',
            baseModel: 'claude-sonnet-4-20250514',
            systemPrompt: 'Hello',
          });
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/models/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"displayName":"New Model"'),
        });
      });

      it('should handle create error', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          })
          .mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ error: 'Model name already exists' }),
          });

        const { result } = renderHook(() => useCustomModels(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await expect(
          act(async () => {
            await result.current.createModel({
              displayName: 'Duplicate',
              baseModel: 'claude-sonnet-4-20250514',
            });
          })
        ).rejects.toThrow('Model name already exists');
      });
    });

    describe('updateModel', () => {
      it('should update a custom model', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ models: mockCustomModels }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                ...mockCustomModels[0],
                displayName: 'Updated Name',
              }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ models: mockCustomModels }),
          });

        const { result } = renderHook(() => useCustomModels(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.updateModel('custom-1', {
            displayName: 'Updated Name',
          });
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/models/custom/custom-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"displayName":"Updated Name"'),
        });
      });

      it('should handle update error', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ models: mockCustomModels }),
          })
          .mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ error: 'Model not found' }),
          });

        const { result } = renderHook(() => useCustomModels(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await expect(
          act(async () => {
            await result.current.updateModel('invalid-id', {
              displayName: 'Test',
            });
          })
        ).rejects.toThrow('Model not found');
      });
    });

    describe('deleteModel', () => {
      it('should delete a custom model', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ models: mockCustomModels }),
          })
          .mockResolvedValueOnce({
            ok: true,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ models: [] }),
          });

        const { result } = renderHook(() => useCustomModels(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.deleteModel('custom-1');
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/models/custom/custom-1', {
          method: 'DELETE',
        });
      });

      it('should handle delete error', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ models: mockCustomModels }),
          })
          .mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ error: 'Cannot delete model in use' }),
          });

        const { result } = renderHook(() => useCustomModels(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await expect(
          act(async () => {
            await result.current.deleteModel('custom-1');
          })
        ).rejects.toThrow('Cannot delete model in use');
      });
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useCustomModels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch custom models');
    });
  });
});
