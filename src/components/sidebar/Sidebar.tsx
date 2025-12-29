'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { Plus, Settings, BarChart3, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SessionList } from './SessionList';
import { SessionSearch } from './SessionSearch';
import { useSessions } from '@/hooks/useSessions';
import { useSessionSearch } from '@/hooks/useSessionSearch';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import type { SessionSummary } from '@/types';

interface SidebarContentProps {
  onNavigate?: () => void;
}

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { resetChat } = useSidebar();
  const { sessions, isLoading, hasMore, isLoadingMore, loadMore, deleteSession, toggleArchive } = useSessions();
  const { query, setQuery, results, isSearching, clearSearch } = useSessionSearch();

  // 検索結果をキャッシュ（検索クリア後も現在のセッションを表示するため）
  const [searchResultsCache, setSearchResultsCache] = useState<Map<string, SessionSummary>>(new Map());

  // 現在のセッションID
  const currentSessionId = pathname.startsWith('/chat/')
    ? pathname.replace('/chat/', '')
    : null;

  // 検索結果が変わるたびにキャッシュに追加
  useEffect(() => {
    if (results) {
      setSearchResultsCache((prev) => {
        const next = new Map(prev);
        results.forEach((r) => next.set(r.id, r));
        return next;
      });
    }
  }, [results]);

  // 検索結果がある場合は検索結果を直接表示、なければ通常のセッション一覧
  // 現在開いているセッションがsessionsにない場合はキャッシュから追加
  const displaySessions = useMemo(() => {
    if (!query.trim() || results === null) {
      // 検索モードではない
      // 現在のセッションがsessionsに含まれていなければキャッシュから追加
      if (currentSessionId && !sessions.some((s) => s.id === currentSessionId)) {
        const cachedSession = searchResultsCache.get(currentSessionId);
        if (cachedSession) {
          return [cachedSession, ...sessions];
        }
      }
      return sessions;
    }
    // 検索結果を直接表示（ロード済みかどうかに関わらず）
    return results;
  }, [sessions, query, results, currentSessionId, searchResultsCache]);

  const handleNewChat = () => {
    if (pathname === '/chat') {
      // Already on /chat page, reset chat state instead of navigating
      resetChat();
    } else if (pathname.startsWith('/chat/')) {
      // From session page, go back to /chat root
      router.back();
    } else {
      // From other pages (settings, usage), push to /chat
      router.push('/chat');
    }
    clearSearch();
    onNavigate?.();
  };

  const handleSessionClick = () => {
    onNavigate?.();
  };

  return (
    <>
      <div className="p-4 pb-2">
        <Button className="w-full" onClick={handleNewChat}>
          <Plus className="h-4 w-4 mr-2" />
          新規チャット
        </Button>
      </div>

      <SessionSearch
        query={query}
        onQueryChange={setQuery}
        onClear={clearSearch}
        isSearching={isSearching}
      />

      <Separator />

      <ScrollArea className="flex-1 overflow-hidden w-full">
        <SessionList
          sessions={displaySessions}
          isLoading={isLoading}
          hasMore={hasMore && !query.trim()}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
          onDelete={deleteSession}
          onToggleArchive={toggleArchive}
          onSessionClick={handleSessionClick}
          searchQuery={query}
          searchResultCount={results?.length}
        />
      </ScrollArea>

      <Separator />

      <div className="p-4 space-y-1">
        <Link href="/files" onClick={onNavigate}>
          <Button variant="ghost" className="w-full justify-start">
            <FolderOpen className="h-4 w-4 mr-2" />
            ファイル
          </Button>
        </Link>
        <Link href="/usage" onClick={onNavigate}>
          <Button variant="ghost" className="w-full justify-start">
            <BarChart3 className="h-4 w-4 mr-2" />
            使用量
          </Button>
        </Link>
        <Link href="/settings" onClick={onNavigate}>
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="h-4 w-4 mr-2" />
            設定
          </Button>
        </Link>
      </div>
    </>
  );
}

export function Sidebar() {
  const { width, setWidth, minWidth, maxWidth } = useSidebar();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;
    let currentWidth = startWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      currentWidth = Math.min(Math.max(startWidth + delta, minWidth), maxWidth);
      setWidth(currentWidth, false);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setWidth(currentWidth, true);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width, setWidth, minWidth, maxWidth]);

  return (
    <aside
      ref={sidebarRef}
      className="border-r flex flex-col h-full bg-muted/30 relative"
      style={{ width: `${width}px` }}
    >
      <SidebarContent />
      <div
        className={cn(
          'absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors',
          isResizing && 'bg-primary/30'
        )}
        onMouseDown={handleMouseDown}
      />
    </aside>
  );
}

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const handleNavigate = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>メニュー</SheetTitle>
        </SheetHeader>
        <div className="flex-1 flex flex-col overflow-hidden">
          <SidebarContent onNavigate={handleNavigate} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
