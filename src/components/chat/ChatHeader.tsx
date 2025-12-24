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
    <header className="border-b bg-background px-4 py-3 flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1">
        <h1 className="font-semibold truncate">
          {session?.title || '新規チャット'}
        </h1>
      </div>
    </header>
  );
}
