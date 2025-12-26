'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Trash2, MoreHorizontal, Archive, ArchiveRestore } from 'lucide-react';
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
  onClick?: () => void;
}

export function SessionItem({ session, onDelete, onToggleArchive, onClick }: SessionItemProps) {
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
      router.push('/chat');
    }
  };

  const handleToggleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropdownOpen(false);
    onToggleArchive(session.id, session.isArchived);
  };

  return (
    <>
      <Link
        href={`/chat/${session.id}`}
        onClick={onClick}
        className={cn(
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
      </Link>

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
