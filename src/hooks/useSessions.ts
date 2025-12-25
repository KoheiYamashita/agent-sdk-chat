'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SessionSummary, SessionListResponse, Session } from '@/types';

const SESSIONS_QUERY_KEY = ['sessions'];

async function fetchSessions(cursor?: string): Promise<SessionListResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);

  const response = await fetch(`/api/sessions?${params.toString()}`);
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

async function toggleArchiveApi(id: string, isArchived: boolean): Promise<{ session: Session }> {
  const response = await fetch(`/api/sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isArchived }),
  });
  if (!response.ok) {
    throw new Error('Failed to toggle archive');
  }
  return response.json();
}

export function useSessions() {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: ({ pageParam }) => fetchSessions(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  // Flatten all pages into a single sessions array
  const sessions = data?.pages.flatMap((page) => page.sessions) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: createSessionApi,
    onSuccess: (result) => {
      queryClient.setQueryData<{ pages: SessionListResponse[]; pageParams: (string | undefined)[] }>(
        SESSIONS_QUERY_KEY,
        (old) => {
          if (!old) return old;
          const newSummary = toSummary(result.session);
          return {
            ...old,
            pages: old.pages.map((page, index) =>
              index === 0
                ? { ...page, sessions: [newSummary, ...page.sessions], total: page.total + 1 }
                : page
            ),
          };
        }
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSessionApi,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<{ pages: SessionListResponse[]; pageParams: (string | undefined)[] }>(
        SESSIONS_QUERY_KEY,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              sessions: page.sessions.filter((s) => s.id !== deletedId),
              total: page.total - 1,
            })),
          };
        }
      );
    },
  });

  const toggleArchiveMutation = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      toggleArchiveApi(id, isArchived),
    onSuccess: (data, { id }) => {
      queryClient.setQueryData<{ pages: SessionListResponse[]; pageParams: (string | undefined)[] }>(
        SESSIONS_QUERY_KEY,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              sessions: page.sessions.map((s) =>
                s.id === id ? { ...s, isArchived: data.session.isArchived } : s
              ),
            })),
          };
        }
      );
      // Also invalidate the session detail query
      queryClient.invalidateQueries({ queryKey: ['session', id] });
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

  const toggleArchive = async (id: string, currentIsArchived: boolean): Promise<void> => {
    await toggleArchiveMutation.mutateAsync({ id, isArchived: !currentIsArchived });
  };

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return {
    sessions,
    total,
    isLoading,
    error,
    hasMore: hasNextPage ?? false,
    isLoadingMore: isFetchingNextPage,
    loadMore,
    createSession,
    deleteSession,
    toggleArchive,
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
