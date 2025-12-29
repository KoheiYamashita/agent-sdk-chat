'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Skill,
  SkillCreateRequest,
  SkillUpdateRequest,
  SkillsResponse,
} from '@/types';

const SKILLS_QUERY_KEY = ['skills'];

// Fetch all skills
async function fetchSkills(): Promise<Skill[]> {
  const response = await fetch('/api/skills');
  if (!response.ok) {
    throw new Error('Failed to fetch skills');
  }
  const data: SkillsResponse = await response.json();
  return data.skills;
}

// Create a skill
async function createSkill(data: SkillCreateRequest): Promise<Skill> {
  const response = await fetch('/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create skill');
  }
  return response.json();
}

// Update a skill
async function updateSkill({
  id,
  data,
}: {
  id: string;
  data: SkillUpdateRequest;
}): Promise<Skill> {
  const response = await fetch(`/api/skills/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update skill');
  }
  return response.json();
}

// Delete a skill
async function deleteSkill(id: string): Promise<void> {
  const response = await fetch(`/api/skills/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete skill');
  }
}

// Hook for skills CRUD
export function useSkills() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: SKILLS_QUERY_KEY,
    queryFn: fetchSkills,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: createSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILLS_QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILLS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILLS_QUERY_KEY });
    },
  });

  return {
    skills: data ?? [],
    isLoading,
    error: error?.message ?? null,
    refetch,

    // Mutations
    createSkill: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error?.message ?? null,

    updateSkill: (id: string, data: SkillUpdateRequest) =>
      updateMutation.mutateAsync({ id, data }),
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error?.message ?? null,

    deleteSkill: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error?.message ?? null,
  };
}
