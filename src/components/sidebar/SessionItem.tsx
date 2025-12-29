'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Trash2, MoreHorizontal, Archive, ArchiveRestore, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { SessionSummary } from '@/types';

interface SessionItemProps {
  session: SessionSummary;
  onDelete: (id: string) => void;
  onToggleArchive: (id: string, isArchived: boolean) => void;
  onSetTag: (id: string, currentTagId: string | null) => void;
  onClick?: () => void;
}

export function SessionItem({ session, onDelete, onToggleArchive, onSetTag, onClick }: SessionItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = pathname === `/chat/${session.id}`;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropdownOpen(false);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    const wasActive = isActive;
    await Promise.resolve(onDelete(session.id));
    setShowDeleteDialog(false);
    if (wasActive) {
      router.replace('/chat');
    }
  };

  const handleToggleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropdownOpen(false);
    onToggleArchive(session.id, session.isArchived);
  };

  const handleSetTag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropdownOpen(false);
    onSetTag(session.id, session.tagId);
  };

  const handleSessionClick = useCallback(() => {
    if (!isActive) {
      if (pathname === '/chat') {
        // From /chat root, push to create history entry
        router.push(`/chat/${session.id}`);
      } else {
        // Between sessions, replace to avoid stack buildup
        router.replace(`/chat/${session.id}`);
      }
    }
    onClick?.();
  }, [isActive, pathname, router, session.id, onClick]);

  return (
    <>
      <div
        onClick={handleSessionClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleSessionClick()}
        className={cn(
          'cursor-pointer',
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group w-full min-w-0',
          isActive
            ? 'bg-accent text-foreground'
            : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
        )}
      >
        <span className="flex-1 truncate">{session.title}</span>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSetTag}>
              <Tag className="h-4 w-4 mr-2" />
              タグ設定
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleArchive}>
              {session.isArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  アーカイブ解除
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  アーカイブ
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleDeleteClick}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{session.title}</AlertDialogTitle>
            <AlertDialogDescription>
              本当に削除しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
