'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageItem } from './MessageItem';
import { ToolApprovalCard } from './ToolApprovalCard';
import type { Message, ToolApprovalRequest, ToolApprovalResponse } from '@/types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  pendingToolApproval?: ToolApprovalRequest | null;
  onToolApprovalRespond?: (response: ToolApprovalResponse) => void;
}

export function MessageList({
  messages,
  isLoading,
  pendingToolApproval,
  onToolApprovalRespond,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingToolApproval]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Claude Code Web UI</p>
          <p className="text-sm mt-1">メッセージを入力して会話を始めましょう</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="flex gap-4 p-4">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        )}
        {pendingToolApproval && onToolApprovalRespond && (
          <ToolApprovalCard
            request={pendingToolApproval}
            onRespond={onToolApprovalRespond}
          />
        )}
      </div>
      <div ref={bottomRef} />
    </ScrollArea>
  );
}
