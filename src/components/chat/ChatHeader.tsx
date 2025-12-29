'use client';

import { Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceBadge } from '@/components/workspace';
import type { Session } from '@/types';

interface ChatHeaderProps {
  session: Session | null;
  workspacePath?: string | null;
  onMenuClick?: () => void;
  onSearchClick?: () => void;
  showSearchButton?: boolean;
}

export function ChatHeader({
  session,
  workspacePath,
  onMenuClick,
  onSearchClick,
  showSearchButton = false,
}: ChatHeaderProps) {
  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-3 sm:px-4 py-3 flex items-center gap-3 sm:gap-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0 hover:bg-accent/60"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1 min-w-0">
        <h1 className="font-semibold truncate text-sm sm:text-base text-foreground/90">
          {session?.title || '新規チャット'}
        </h1>
      </div>
      {showSearchButton && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 hover:bg-accent/60"
          onClick={onSearchClick}
        >
          <Search className="h-4 w-4" />
        </Button>
      )}
      {workspacePath !== undefined && (
        <WorkspaceBadge path={workspacePath} />
      )}
    </header>
  );
}
