'use client';

import { useChat } from '@/hooks/useChat';
import { useSettings } from '@/hooks/useSettings';
import { useSidebar } from '@/contexts/SidebarContext';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import type { PermissionMode } from '@/types';

interface ChatContainerProps {
  sessionId?: string;
}

export function ChatContainer({ sessionId }: ChatContainerProps) {
  const { open: openSidebar } = useSidebar();
  const {
    messages,
    isLoading,
    isGenerating,
    error,
    session,
    pendingToolApproval,
    hasMoreMessages,
    isLoadingMoreMessages,
    loadMoreMessages,
    sendMessage,
    stopGeneration,
    respondToToolApproval,
  } = useChat({ sessionId });

  const { settings } = useSettings();
  const defaultPermissionMode: PermissionMode = settings?.general.defaultPermissionMode ?? 'default';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ChatHeader session={session} onMenuClick={openSidebar} />

      {error && (
        <div className="bg-destructive/10 border-destructive/20 border-b px-4 py-2 text-sm text-destructive">
          エラー: {error}
        </div>
      )}

      <MessageList
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMoreMessages}
        isLoadingMore={isLoadingMoreMessages}
        onLoadMore={loadMoreMessages}
        pendingToolApproval={pendingToolApproval}
        onToolApprovalRespond={respondToToolApproval}
      />

      {session?.isArchived ? (
        <div className="border-t bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          このチャットはアーカイブされています（閲覧専用）
        </div>
      ) : (
        <InputArea
          onSubmit={sendMessage}
          onStop={stopGeneration}
          disabled={isLoading || !!pendingToolApproval}
          isGenerating={isGenerating}
          defaultPermissionMode={defaultPermissionMode}
        />
      )}
    </div>
  );
}
