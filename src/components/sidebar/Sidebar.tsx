'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SessionList } from './SessionList';
import { useSessions } from '@/hooks/useSessions';

export function Sidebar() {
  const router = useRouter();
  const { sessions, isLoading, createSession, deleteSession } = useSessions();

  const handleNewChat = async () => {
    const newSession = await createSession();
    if (newSession) {
      router.push(`/chat/${newSession.id}`);
    }
  };

  return (
    <aside className="w-64 border-r flex flex-col h-full bg-muted/30">
      <div className="p-4">
        <Button className="w-full" onClick={handleNewChat}>
          <Plus className="h-4 w-4 mr-2" />
          新規チャット
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <SessionList
          sessions={sessions}
          isLoading={isLoading}
          onDelete={deleteSession}
        />
      </ScrollArea>

      <Separator />

      <div className="p-4">
        <Link href="/settings">
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="h-4 w-4 mr-2" />
            設定
          </Button>
        </Link>
      </div>
    </aside>
  );
}
