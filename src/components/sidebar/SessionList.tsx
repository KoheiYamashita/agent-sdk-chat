'use client';

import { SessionItem } from './SessionItem';
import { Skeleton } from '@/components/ui/skeleton';
import type { SessionSummary } from '@/types';

interface SessionListProps {
  sessions: SessionSummary[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

export function SessionList({ sessions, isLoading, onDelete }: SessionListProps) {
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
    <div className="space-y-1 p-2">
      {sessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
