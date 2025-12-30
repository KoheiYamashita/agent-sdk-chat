'use client';

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { SessionItem } from './SessionItem';
import { TagGroupHeader } from './TagGroupHeader';
import { TagSelectDialog } from './TagSelectDialog';
import { TagRenameDialog } from './TagRenameDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Loader2 } from 'lucide-react';
import { useTags } from '@/hooks/useTags';
import type { SessionSummary } from '@/types';

interface SessionGroup {
  tagId: string | null;
  tagName: string;
  sessions: SessionSummary[];
}

interface SessionListProps {
  sessions: SessionSummary[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onDelete: (id: string) => void;
  onToggleArchive: (id: string, isArchived: boolean) => void;
  onSetTag: (id: string, tagId: string | null) => Promise<void>;
  onSessionClick?: () => void;
  searchQuery?: string;
  searchResultCount?: number;
}

export function SessionList({
  sessions,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onDelete,
  onToggleArchive,
  onSetTag,
  onSessionClick,
  searchQuery,
  searchResultCount,
}: SessionListProps) {
  const t = useTranslations('session');
  const isSearching = Boolean(searchQuery?.trim());
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { tags, updateTag, deleteTag, isUpdating, updateError } = useTags();

  // State for dialogs
  const [tagSelectSession, setTagSelectSession] = useState<{ id: string; tagId: string | null } | null>(null);
  const [tagRenameTarget, setTagRenameTarget] = useState<{ id: string; name: string } | null>(null);

  // State for open/closed groups (persisted in localStorage)
  const [openGroups, setOpenGroups] = useState<Set<string | null>>(() => {
    if (typeof window === 'undefined') return new Set([null]);
    try {
      const saved = localStorage.getItem('session-list-open-groups');
      if (saved) {
        const parsed = JSON.parse(saved) as (string | null)[];
        return new Set(parsed);
      }
    } catch {
      // ignore
    }
    return new Set([null]); // Default: untagged group open
  });

  // Save open groups to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('session-list-open-groups', JSON.stringify([...openGroups]));
    } catch {
      // ignore
    }
  }, [openGroups]);

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

  // Group sessions by tag
  const groups = useMemo<SessionGroup[]>(() => {
    // Create map: tagId -> sessions
    const groupMap = new Map<string | null, SessionSummary[]>();

    // Initialize with all tags (even empty ones)
    tags.forEach((tag) => groupMap.set(tag.id, []));
    groupMap.set(null, []); // Untagged group

    // Distribute sessions
    sessions.forEach((session) => {
      const tagId = session.tagId;
      if (!groupMap.has(tagId)) {
        groupMap.set(tagId, []);
      }
      groupMap.get(tagId)!.push(session);
    });

    // Build result: tags sorted by name, then untagged at the end
    const result: SessionGroup[] = [];

    // Tagged groups (sorted by name)
    const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    sortedTags.forEach((tag) => {
      result.push({
        tagId: tag.id,
        tagName: tag.name,
        sessions: groupMap.get(tag.id) ?? [],
      });
    });

    // Untagged group at the end
    const untaggedSessions = groupMap.get(null) ?? [];
    result.push({
      tagId: null,
      tagName: t('untagged'),
      sessions: untaggedSessions,
    });

    return result;
  }, [sessions, tags, t]);

  const toggleGroup = (tagId: string | null) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const handleSetTag = (sessionId: string, currentTagId: string | null) => {
    setTagSelectSession({ id: sessionId, tagId: currentTagId });
  };

  const handleTagSelect = async (tagId: string | null): Promise<void> => {
    if (tagSelectSession) {
      await onSetTag(tagSelectSession.id, tagId);
    }
  };

  const handleRenameTag = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    if (tag) {
      setTagRenameTarget({ id: tagId, name: tag.name });
    }
  };

  const handleSaveRename = async (newName: string) => {
    if (tagRenameTarget) {
      await updateTag(tagRenameTarget.id, { name: newName });
      setTagRenameTarget(null);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteTag(tagId);
    } catch {
      // Error is handled by the hook
    }
  };

  const canDeleteTag = (tagId: string): boolean => {
    const tag = tags.find((t) => t.id === tagId);
    return tag ? tag.sessionCount === 0 : false;
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0 && !isSearching && tags.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {t('noHistory')}
      </div>
    );
  }

  // When searching, show flat list (no grouping)
  if (isSearching) {
    return (
      <div className="space-y-1 p-2 w-full min-w-0 overflow-hidden">
        {searchResultCount !== undefined && (
          <div className="px-2 py-1 text-xs text-muted-foreground">
            {t('searchResults', { count: searchResultCount })}
          </div>
        )}
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {t('noMatchingChats', { query: searchQuery || '' })}
          </div>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              onDelete={onDelete}
              onToggleArchive={onToggleArchive}
              onSetTag={handleSetTag}
              onClick={onSessionClick}
            />
          ))
        )}
        <div ref={loadMoreRef} className="h-1" />
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Tag Select Dialog */}
        <TagSelectDialog
          open={tagSelectSession !== null}
          onOpenChange={(open) => !open && setTagSelectSession(null)}
          currentTagId={tagSelectSession?.tagId ?? null}
          onSelect={handleTagSelect}
        />
      </div>
    );
  }

  // Normal view: grouped by tag
  return (
    <div className="space-y-1 p-2 w-full min-w-0 overflow-hidden">
      {groups.map((group) => (
        <Collapsible
          key={group.tagId ?? 'untagged'}
          open={openGroups.has(group.tagId)}
          onOpenChange={() => toggleGroup(group.tagId)}
        >
          <TagGroupHeader
            tagId={group.tagId}
            tagName={group.tagName}
            sessionCount={group.sessions.length}
            isOpen={openGroups.has(group.tagId)}
            onRename={handleRenameTag}
            onDelete={handleDeleteTag}
            canDelete={group.tagId ? canDeleteTag(group.tagId) : false}
          />
          <CollapsibleContent className="pl-4">
            {group.sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                onDelete={onDelete}
                onToggleArchive={onToggleArchive}
                onSetTag={handleSetTag}
                onClick={onSessionClick}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="h-1" />
      {isLoadingMore && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Tag Select Dialog */}
      <TagSelectDialog
        open={tagSelectSession !== null}
        onOpenChange={(open) => !open && setTagSelectSession(null)}
        currentTagId={tagSelectSession?.tagId ?? null}
        onSelect={handleTagSelect}
      />

      {/* Tag Rename Dialog */}
      <TagRenameDialog
        open={tagRenameTarget !== null}
        onOpenChange={(open) => !open && setTagRenameTarget(null)}
        currentName={tagRenameTarget?.name ?? ''}
        onSave={handleSaveRename}
        isLoading={isUpdating}
        error={updateError}
      />
    </div>
  );
}
