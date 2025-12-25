'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trash2, MoreHorizontal, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { SessionSummary } from '@/types';

interface SessionItemProps {
  session: SessionSummary;
  onDelete: (id: string) => void;
  onToggleArchive: (id: string, isArchived: boolean) => void;
  onClick?: () => void;
}

export function SessionItem({ session, onDelete, onToggleArchive, onClick }: SessionItemProps) {
  const pathname = usePathname();
  const isActive = pathname === `/chat/${session.id}`;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(session.id);
  };

  const handleToggleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleArchive(session.id, session.isArchived);
  };

  return (
    <Link
      href={`/chat/${session.id}`}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group w-full min-w-0',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
      )}
    >
      <span className="flex-1 truncate">{session.title}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
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
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Link>
  );
}
