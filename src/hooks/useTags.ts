'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  TagWithSessionCount,
  TagsResponse,
  TagCreateRequest,
  TagUpdateRequest,
} from '@/types';

const TAGS_QUERY_KEY = ['tags'];

// Fetch all tags
async function fetchTags(): Promise<TagWithSessionCount[]> {
  const response = await fetch('/api/tags');
  if (!response.ok) {
    throw new Error('Failed to fetch tags');
  }
  const data: TagsResponse = await response.json();
  return data.tags;
}

// Create a tag
async function createTag(data: TagCreateRequest): Promise<TagWithSessionCount> {
  const response = await fetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create tag');
  }
  return response.json();
}

// Update a tag
async function updateTag({
  id,
  data,
}: {
  id: string;
  data: TagUpdateRequest;
}): Promise<TagWithSessionCount> {
  const response = await fetch(`/api/tags/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update tag');
  }
  return response.json();
}

// Delete a tag
async function deleteTag(id: string): Promise<void> {
  const response = await fetch(`/api/tags/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete tag');
  }
}

export function useTags() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: fetchTags,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    },
  });

  return {
    tags: data ?? [],
    isLoading,
    error: error?.message ?? null,
    refetch,

    createTag: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error?.message ?? null,

    updateTag: (id: string, data: TagUpdateRequest) =>
      updateMutation.mutateAsync({ id, data }),
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error?.message ?? null,

    deleteTag: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error?.message ?? null,
  };
}
