'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  StandardModel,
  CustomModel,
  AllModelsResponse,
  CustomModelCreateRequest,
  CustomModelUpdateRequest,
  SelectableModel,
} from '@/types';

const MODELS_QUERY_KEY = ['models'];
const SUPPORTED_MODELS_QUERY_KEY = ['models', 'supported'];
const CUSTOM_MODELS_QUERY_KEY = ['models', 'custom'];

// Fetch all models (standard + custom)
async function fetchAllModels(): Promise<AllModelsResponse> {
  const response = await fetch('/api/models');
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  return response.json();
}

// Fetch supported (standard) models only
async function fetchSupportedModels(): Promise<StandardModel[]> {
  const response = await fetch('/api/models/supported');
  if (!response.ok) {
    throw new Error('Failed to fetch supported models');
  }
  const data = await response.json();
  return data.models;
}

// Fetch custom models only
async function fetchCustomModels(): Promise<CustomModel[]> {
  const response = await fetch('/api/models/custom');
  if (!response.ok) {
    throw new Error('Failed to fetch custom models');
  }
  const data = await response.json();
  return data.models;
}

// Create a custom model
async function createCustomModel(
  data: CustomModelCreateRequest
): Promise<CustomModel> {
  const response = await fetch('/api/models/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create custom model');
  }
  return response.json();
}

// Update a custom model
async function updateCustomModel({
  id,
  data,
}: {
  id: string;
  data: CustomModelUpdateRequest;
}): Promise<CustomModel> {
  const response = await fetch(`/api/models/custom/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update custom model');
  }
  return response.json();
}

// Delete a custom model
async function deleteCustomModel(id: string): Promise<void> {
  const response = await fetch(`/api/models/custom/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete custom model');
  }
}

// Convert to SelectableModel format
function toSelectableModel(
  model: StandardModel | CustomModel,
  type: 'standard' | 'custom'
): SelectableModel {
  if (type === 'standard') {
    const std = model as StandardModel;
    return {
      type: 'standard',
      id: std.id,
      displayName: std.displayName,
      description: std.description,
      icon: null,
      iconColor: null,
      iconImageUrl: null,
      baseModelId: std.id,
      systemPrompt: null,
    };
  } else {
    const custom = model as CustomModel;
    return {
      type: 'custom',
      id: custom.id,
      displayName: custom.displayName,
      description: custom.description ?? undefined,
      icon: custom.icon,
      iconColor: custom.iconColor,
      iconImageUrl: custom.iconImageUrl,
      baseModelId: custom.baseModel,
      systemPrompt: custom.systemPrompt,
      skillSettings: custom.skillSettings,
    };
  }
}

// Hook to get all models
export function useAllModels() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: MODELS_QUERY_KEY,
    queryFn: fetchAllModels,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const selectableModels: SelectableModel[] = [];

  if (data) {
    // Add standard models
    data.standardModels.forEach((model) => {
      selectableModels.push(toSelectableModel(model, 'standard'));
    });

    // Add custom models
    data.customModels.forEach((model) => {
      selectableModels.push(toSelectableModel(model, 'custom'));
    });
  }

  return {
    standardModels: data?.standardModels ?? [],
    customModels: data?.customModels ?? [],
    selectableModels,
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

// Hook to get supported (standard) models only
export function useSupportedModels() {
  const { data, isLoading, error } = useQuery({
    queryKey: SUPPORTED_MODELS_QUERY_KEY,
    queryFn: fetchSupportedModels,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    models: data ?? [],
    isLoading,
    error: error?.message ?? null,
  };
}

// Hook for custom models CRUD
export function useCustomModels() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: CUSTOM_MODELS_QUERY_KEY,
    queryFn: fetchCustomModels,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: createCustomModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOM_MODELS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MODELS_QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateCustomModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOM_MODELS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MODELS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOM_MODELS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MODELS_QUERY_KEY });
    },
  });

  return {
    models: data ?? [],
    isLoading,
    error: error?.message ?? null,
    refetch,

    // Mutations
    createModel: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error?.message ?? null,

    updateModel: (id: string, data: CustomModelUpdateRequest) =>
      updateMutation.mutateAsync({ id, data }),
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error?.message ?? null,

    deleteModel: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error?.message ?? null,
  };
}
