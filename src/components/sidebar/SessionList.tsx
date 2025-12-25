'use client';

import { useEffect, useRef, useCallback } from 'react';
import { SessionItem } from './SessionItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import type { SessionSummary } from '@/types';

interface SessionListProps {
  sessions: SessionSummary[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onDelete: (id: string) => void;
  onToggleArchive: (id: string, isArchived: boolean) => void;
  onSessionClick?: () => void;
}

export function SessionList({
  sessions,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onDelete,
  onToggleArchive,
  onSessionClick,
}: SessionListProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoadingMore) {
        onLoadMore();
      }
    },
    [hasMore, isLoadingMore, onLoadMore]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [handleIntersection]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        チャット履歴がありません
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2 w-full min-w-0 overflow-hidden">
      {sessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          onDelete={onDelete}
          onToggleArchive={onToggleArchive}
          onClick={onSessionClick}
        />
      ))}
      {/* Load more trigger */}
      <div ref={loadMoreRef} className="h-1" />
      {isLoadingMore && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
