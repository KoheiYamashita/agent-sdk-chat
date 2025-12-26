'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { Plus, Settings } from 'lucide-react';
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
import { useSessions } from '@/hooks/useSessions';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface SidebarContentProps {
  onNavigate?: () => void;
}

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { resetChat } = useSidebar();
  const { sessions, isLoading, hasMore, isLoadingMore, loadMore, deleteSession, toggleArchive } = useSessions();

  const handleNewChat = () => {
    if (pathname === '/chat') {
      // Already on /chat page, reset chat state instead of navigating
      resetChat();
    } else {
      router.push('/chat');
    }
    onNavigate?.();
  };

  const handleSessionClick = () => {
    onNavigate?.();
  };

  return (
    <>
      <div className="p-4">
        <Button className="w-full" onClick={handleNewChat}>
          <Plus className="h-4 w-4 mr-2" />
          新規チャット
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1 overflow-hidden w-full">
        <SessionList
          sessions={sessions}
          isLoading={isLoading}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
          onDelete={deleteSession}
          onToggleArchive={toggleArchive}
          onSessionClick={handleSessionClick}
        />
      </ScrollArea>

      <Separator />

      <div className="p-4">
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
