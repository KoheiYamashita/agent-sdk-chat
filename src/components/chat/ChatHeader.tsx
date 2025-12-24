'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Session } from '@/types';

interface ChatHeaderProps {
  session: Session | null;
  onMenuClick?: () => void;
}

export function ChatHeader({ session, onMenuClick }: ChatHeaderProps) {
  return (
    <header className="border-b bg-background px-2 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1 min-w-0">
        <h1 className="font-semibold truncate text-sm sm:text-base">
          {session?.title || '新規チャット'}
        </h1>
      </div>
    </header>
  );
}
