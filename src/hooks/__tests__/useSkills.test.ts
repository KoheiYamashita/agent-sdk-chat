import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useSkills } from '../useSkills';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useSkills', () => {
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

  const mockSkills = [
    {
      id: 'skill-1',
      name: 'commit',
      content: '# Commit skill\nMake a git commit',
      isEnabled: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'skill-2',
      name: 'review',
      content: '# Review skill\nCode review',
      isEnabled: false,
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  ];

  describe('initial state', () => {
    it('should return initial loading state', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ skills: [] }),
      });

      const { result } = renderHook(() => useSkills(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.skills).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should provide required functions', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ skills: [] }),
      });

      const { result } = renderHook(() => useSkills(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.createSkill).toBe('function');
      expect(typeof result.current.updateSkill).toBe('function');
      expect(typeof result.current.deleteSkill).toBe('function');
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('fetchSkills', () => {
    it('should fetch and return skills', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ skills: mockSkills }),
      });

      const { result } = renderHook(() => useSkills(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.skills).toHaveLength(2);
      expect(result.current.skills[0].name).toBe('commit');
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useSkills(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch skills');
    });
  });

  describe('createSkill', () => {
    it('should create a new skill', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ skills: mockSkills }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'skill-3',
              name: 'new-skill',
              content: '# New skill',
              isEnabled: true,
              createdAt: '2024-01-03T00:00:00.000Z',
              updatedAt: '2024-01-03T00:00:00.000Z',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ skills: mockSkills }),
        });

      const { result } = renderHook(() => useSkills(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createSkill({
          name: 'new-skill',
          content: '# New skill',
          isEnabled: true,
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'new-skill',
          content: '# New skill',
          isEnabled: true,
        }),
      });
    });

    it('should handle create error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ skills: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Skill name already exists' }),
        });

      const { result } = renderHook(() => useSkills(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.createSkill({
            name: 'duplicate',
            content: '',
            isEnabled: true,
          });
        })
      ).rejects.toThrow('Skill name already exists');
    });
  });

  describe('updateSkill', () => {
    it('should update a skill', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ skills: mockSkills }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockSkills[0],
              content: '# Updated content',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ skills: mockSkills }),
        });

      const { result } = renderHook(() => useSkills(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateSkill('skill-1', { content: '# Updated content' });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/skills/skill-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '# Updated content' }),
      });
    });

    it('should handle update error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ skills: mockSkills }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Skill not found' }),
        });

      const { result } = renderHook(() => useSkills(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.updateSkill('invalid-id', { content: 'test' });
        })
      ).rejects.toThrow('Skill not found');
    });
  });

  describe('deleteSkill', () => {
    it('should delete a skill', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ skills: mockSkills }),
        })
        .mockResolvedValueOnce({
          ok: true,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ skills: [mockSkills[1]] }),
        });

      const { result } = renderHook(() => useSkills(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteSkill('skill-1');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/skills/skill-1', {
        method: 'DELETE',
      });
    });

    it('should handle delete error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ skills: mockSkills }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Cannot delete skill' }),
        });

      const { result } = renderHook(() => useSkills(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.deleteSkill('skill-1');
        })
      ).rejects.toThrow('Cannot delete skill');
    });
  });

  describe('refetch', () => {
    it('should refetch skills', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ skills: mockSkills }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              skills: [
                ...mockSkills,
                { id: 'skill-3', name: 'new', content: '', isEnabled: true },
              ],
            }),
        });

      const { result } = renderHook(() => useSkills(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.skills).toHaveLength(2);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.skills).toHaveLength(3);
      });
    });
  });

  describe('mutation states', () => {
    it('should set isCreating during creation', async () => {
      let resolveCreate: (value: unknown) => void;
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ skills: [] }),
        })
        .mockImplementationOnce(() => createPromise);

      const { result } = renderHook(() => useSkills(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.createSkill({ name: 'test', content: '', isEnabled: true });
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(true);
      });

      await act(async () => {
        resolveCreate!({
          ok: true,
          json: () =>
            Promise.resolve({ id: 'new', name: 'test', content: '', isEnabled: true }),
        });
      });
    });

    it('should set isUpdating during update', async () => {
      let resolveUpdate: (value: unknown) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ skills: mockSkills }),
        })
        .mockImplementationOnce(() => updatePromise);

      const { result } = renderHook(() => useSkills(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateSkill('skill-1', { content: 'updated' });
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(true);
      });

      await act(async () => {
        resolveUpdate!({
          ok: true,
          json: () => Promise.resolve({ ...mockSkills[0], content: 'updated' }),
        });
      });
    });

    it('should set isDeleting during deletion', async () => {
      let resolveDelete: (value: unknown) => void;
      const deletePromise = new Promise((resolve) => {
        resolveDelete = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ skills: mockSkills }),
        })
        .mockImplementationOnce(() => deletePromise);

      const { result } = renderHook(() => useSkills(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.deleteSkill('skill-1');
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(true);
      });

      await act(async () => {
        resolveDelete!({ ok: true });
      });
    });
  });
});
