import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useSettings } from '../useSettings';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useSettings', () => {
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

  const mockSettings = {
    general: {
      language: 'en' as const,
      defaultModel: 'claude-sonnet-4-20250514',
      defaultPermissionMode: 'default' as const,
      defaultThinkingEnabled: true,
      theme: 'system' as const,
      approvalTimeoutMinutes: 60,
    },
    permissions: {
      mode: 'default',
      allowedTools: [],
      disallowedTools: [],
    },
    sandbox: {
      workspacePath: '/home/user/workspace',
      claudeMdTemplate: '',
    },
    appearance: {
      userIcon: 'user' as const,
      userInitials: '',
      userImageUrl: '',
      userName: '',
      botIcon: 'bot' as const,
      botInitials: '',
      botImageUrl: '',
      favicon: 'robot' as const,
      customFaviconUrl: '',
    },
    titleGeneration: {
      enabled: true,
      model: 'claude-sonnet-4-20250514',
      prompt: 'Generate a title',
    },
    danger: {
      showUsage: false,
      useSubscriptionPlan: false,
    },
  };

  describe('initial state', () => {
    it('should return initial loading state', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      });

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.settings).toBeUndefined();
      expect(result.current.error).toBeNull();
    });

    it('should provide required functions', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      });

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.updateGeneralSettings).toBe('function');
      expect(typeof result.current.updateAppearanceSettings).toBe('function');
      expect(typeof result.current.updateTitleGenerationSettings).toBe('function');
      expect(typeof result.current.updateDangerSettings).toBe('function');
      expect(typeof result.current.saveSettings).toBe('function');
    });
  });

  describe('fetchSettings', () => {
    it('should fetch and return settings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      });

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toEqual(mockSettings);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch settings');
    });
  });

  describe('updateGeneralSettings', () => {
    it('should update general settings', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockSettings,
              general: { ...mockSettings.general, language: 'ja' },
            }),
        });

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateGeneralSettings({ language: 'ja' });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"language":"ja"'),
      });
    });

    it('should not update if settings not loaded', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.updateGeneralSettings({ language: 'ja' });
      });

      // Only the initial fetch should be called
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateAppearanceSettings', () => {
    it('should update appearance settings', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockSettings,
              appearance: { ...mockSettings.appearance, theme: 'dark' },
            }),
        });

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateAppearanceSettings({ userIcon: 'star' });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"userIcon":"star"'),
      });
    });
  });

  describe('updateTitleGenerationSettings', () => {
    it('should update title generation settings', async () => {
      const newTitleSettings = {
        enabled: false,
        model: 'claude-sonnet-4-20250514',
        prompt: 'New prompt',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockSettings,
              titleGeneration: newTitleSettings,
            }),
        });

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateTitleGenerationSettings(newTitleSettings);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"enabled":false'),
      });
    });
  });

  describe('updateDangerSettings', () => {
    it('should update danger settings', async () => {
      const newDangerSettings = {
        showUsage: true,
        useSubscriptionPlan: false,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockSettings,
              danger: newDangerSettings,
            }),
        });

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateDangerSettings(newDangerSettings);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"showUsage":true'),
      });
    });
  });

  describe('saveSettings', () => {
    it('should save partial settings', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockSettings,
              general: { ...mockSettings.general, language: 'zh' },
            }),
        });

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveSettings({
          general: { ...mockSettings.general, language: 'zh' },
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      });
    });

    it('should merge with existing settings', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        });

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.saveSettings({});
      });

      // Should use existing settings when nothing provided
      const callBody = JSON.parse(
        (mockFetch.mock.calls[1][1] as { body: string }).body
      );
      expect(callBody.general).toEqual(mockSettings.general);
    });

    it('should not save if settings not loaded', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.saveSettings({ general: mockSettings.general });
      });

      // Only the initial fetch should be called
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('isSaving', () => {
    it('should set isSaving during mutation', async () => {
      let resolveSave: (value: unknown) => void;
      const savePromise = new Promise((resolve) => {
        resolveSave = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        })
        .mockImplementationOnce(() => savePromise);

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateGeneralSettings({ language: 'ja' });
      });

      await waitFor(() => {
        expect(result.current.isSaving).toBe(true);
      });

      await act(async () => {
        resolveSave!({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        });
      });

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false);
      });
    });
  });

  describe('saveError', () => {
    it('should set saveError on mutation failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.updateGeneralSettings({ language: 'ja' });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.saveError).toBe('Failed to update settings');
      });
    });
  });
});
