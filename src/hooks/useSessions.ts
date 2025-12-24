'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SessionSummary, SessionListResponse, Session } from '@/types';

const SESSIONS_QUERY_KEY = ['sessions'];

async function fetchSessions(): Promise<SessionListResponse> {
  const response = await fetch('/api/sessions');
  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }
  return response.json();
}

async function createSessionApi(): Promise<{ session: Session }> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Failed to create session');
  }
  return response.json();
}

async function deleteSessionApi(id: string): Promise<void> {
  const response = await fetch(`/api/sessions/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete session');
  }
}

export function useSessions() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: fetchSessions,
  });

  const createMutation = useMutation({
    mutationFn: createSessionApi,
    onSuccess: (data) => {
      queryClient.setQueryData<SessionListResponse>(SESSIONS_QUERY_KEY, (old) => {
        if (!old) return { sessions: [toSummary(data.session)], total: 1 };
        return {
          sessions: [toSummary(data.session), ...old.sessions],
          total: old.total + 1,
        };
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSessionApi,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<SessionListResponse>(SESSIONS_QUERY_KEY, (old) => {
        if (!old) return { sessions: [], total: 0 };
        return {
          sessions: old.sessions.filter((s) => s.id !== deletedId),
          total: old.total - 1,
        };
      });
    },
  });

  const createSession = async (): Promise<Session | null> => {
    try {
      const result = await createMutation.mutateAsync();
      return result.session;
    } catch {
      return null;
    }
  };

  const deleteSession = async (id: string): Promise<void> => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    sessions: data?.sessions ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    createSession,
    deleteSession,
  };
}

function toSummary(session: Session): SessionSummary {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: 0,
    isArchived: session.isArchived,
  };
}
