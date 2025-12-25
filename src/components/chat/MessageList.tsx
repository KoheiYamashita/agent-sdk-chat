'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { MessageItem } from './MessageItem';
import { ToolApprovalCard } from './ToolApprovalCard';
import type { Message, ToolApprovalRequest, ToolApprovalResponse } from '@/types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  pendingToolApproval?: ToolApprovalRequest | null;
  onToolApprovalRespond?: (response: ToolApprovalResponse) => void;
}

export function MessageList({
  messages,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
  pendingToolApproval,
  onToolApprovalRespond,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [prevMessagesLength, setPrevMessagesLength] = useState(0);
  const [prevScrollHeight, setPrevScrollHeight] = useState(0);
  const isInitialLoad = useRef(true);

  // Scroll to bottom on new messages (only if user is near bottom)
  useEffect(() => {
    if (messages.length > prevMessagesLength) {
      // Check if this is new messages added at the end (not loaded older ones)
      const messagesAddedAtEnd = messages.length > 0 &&
        prevMessagesLength > 0 &&
        messages[prevMessagesLength - 1]?.id === messages[messages.length - 1]?.id === false;

      if (messagesAddedAtEnd || isInitialLoad.current) {
        bottomRef.current?.scrollIntoView({ behavior: isInitialLoad.current ? 'auto' : 'smooth' });
        isInitialLoad.current = false;
      }
    }
    setPrevMessagesLength(messages.length);
  }, [messages, prevMessagesLength, pendingToolApproval]);

  // Maintain scroll position when loading older messages
  useEffect(() => {
    const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollArea && isLoadingMore === false && prevScrollHeight > 0) {
      const newScrollHeight = scrollArea.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeight;
      if (scrollDiff > 0) {
        scrollArea.scrollTop = scrollDiff;
      }
    }
  }, [isLoadingMore, prevScrollHeight]);

  // Detect when scrolled to top
  const handleScroll = useCallback(() => {
    const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollArea) return;

    // If scrolled near the top, load more messages
    if (scrollArea.scrollTop < 100 && hasMore && !isLoadingMore) {
      setPrevScrollHeight(scrollArea.scrollHeight);
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  // Intersection observer for top trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollArea) {
            setPrevScrollHeight(scrollArea.scrollHeight);
          }
          onLoadMore();
        }
      },
      {
        root: scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]'),
        rootMargin: '100px',
        threshold: 0,
      }
    );

    if (topRef.current) {
      observer.observe(topRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

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
    <ScrollArea
      ref={scrollAreaRef}
      className="flex-1 min-h-0"
      onScrollCapture={handleScroll}
    >
      <div className="divide-y">
        {/* Load more trigger */}
        <div ref={topRef} className="h-1" />

        {/* Loading indicator for older messages */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

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
