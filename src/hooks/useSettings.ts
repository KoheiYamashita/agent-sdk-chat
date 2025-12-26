'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SettingsData, GeneralSettings, AppearanceSettings } from '@/types';

const SETTINGS_QUERY_KEY = ['settings'];

async function fetchSettings(): Promise<SettingsData> {
  const response = await fetch('/api/settings');
  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }
  return response.json();
}

async function updateSettings(settings: SettingsData): Promise<SettingsData> {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    throw new Error('Failed to update settings');
  }
  return response.json();
}

export function useSettings() {
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, data);
    },
  });

  const updateGeneralSettings = async (general: Partial<GeneralSettings>) => {
    if (!settings) return;

    const newSettings: SettingsData = {
      ...settings,
      general: {
        ...settings.general,
        ...general,
      },
    };

    await mutation.mutateAsync(newSettings);
  };

  const saveSettings = async (newSettings: Partial<SettingsData>) => {
    if (!settings) return;

    const merged: SettingsData = {
      general: newSettings.general ?? settings.general,
      permissions: newSettings.permissions ?? settings.permissions,
      sandbox: newSettings.sandbox ?? settings.sandbox,
      appearance: newSettings.appearance ?? settings.appearance,
    };

    await mutation.mutateAsync(merged);
  };

  const updateAppearanceSettings = async (appearance: Partial<AppearanceSettings>) => {
    if (!settings) return;

    const newSettings: SettingsData = {
      ...settings,
      appearance: {
        ...settings.appearance,
        ...appearance,
      },
    };

    await mutation.mutateAsync(newSettings);
  };

  return {
    settings,
    isLoading,
    error: error?.message ?? null,
    isSaving: mutation.isPending,
    saveError: mutation.error?.message ?? null,
    updateGeneralSettings,
    updateAppearanceSettings,
    saveSettings,
  };
}
