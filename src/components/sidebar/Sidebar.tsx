'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

interface SidebarContentProps {
  onNavigate?: () => void;
}

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const router = useRouter();
  const { sessions, isLoading, createSession, deleteSession, toggleArchive } = useSessions();

  const handleNewChat = async () => {
    const newSession = await createSession();
    if (newSession) {
      router.push(`/chat/${newSession.id}`);
      onNavigate?.();
    }
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
  return (
    <aside className="w-64 border-r flex flex-col h-full bg-muted/30">
      <SidebarContent />
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
