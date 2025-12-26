'use client';

import { useState, useCallback, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { useSettings } from '@/hooks/useSettings';
import { useSidebar } from '@/contexts/SidebarContext';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { WorkspaceSelector } from '@/components/workspace';
import type { PermissionMode } from '@/types';

interface ChatContainerProps {
  sessionId?: string;
}

export function ChatContainer({ sessionId }: ChatContainerProps) {
  const { open: openSidebar, chatResetKey } = useSidebar();
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [workspaceDisplayPath, setWorkspaceDisplayPath] = useState<string | null>(null);

  // Reset local state when chatResetKey changes (triggered by "New Chat" button)
  useEffect(() => {
    if (chatResetKey > 0) {
      setWorkspacePath(null);
      setWorkspaceDisplayPath(null);
    }
  }, [chatResetKey]);

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
    sendMessage: originalSendMessage,
    stopGeneration,
    respondToToolApproval,
  } = useChat({ sessionId, resetKey: chatResetKey });

  const { settings } = useSettings();
  const defaultPermissionMode: PermissionMode = settings?.general.defaultPermissionMode ?? 'default';

  // Handle workspace selection
  const handleWorkspaceSelect = useCallback((path: string, displayPath: string) => {
    setWorkspacePath(path);
    setWorkspaceDisplayPath(displayPath);
  }, []);

  // Wrap sendMessage to include workspacePath and displayPath
  const sendMessage = useCallback(
    (message: string, options: { permissionMode: PermissionMode }) => {
      originalSendMessage(message, {
        ...options,
        workspacePath: workspacePath ?? undefined,
        workspaceDisplayPath: workspaceDisplayPath ?? undefined,
      });
    },
    [originalSendMessage, workspacePath, workspaceDisplayPath]
  );

  // Show workspace selector for new chats with no messages
  const isNewChat = !sessionId && messages.length === 0 && !isLoading;
  // Get display path from session settings or local state
  const displayPath = session?.settings?.workspaceDisplayPath ?? workspaceDisplayPath;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ChatHeader
        session={session}
        workspacePath={messages.length > 0 ? displayPath : undefined}
        onMenuClick={openSidebar}
      />

      {error && (
        <div className="bg-destructive/10 border-destructive/20 border-b px-4 py-2 text-sm text-destructive">
          エラー: {error}
        </div>
      )}

      {isNewChat ? (
        <div className="flex-1 overflow-auto">
          <WorkspaceSelector
            selectedPath={workspacePath}
            onSelect={handleWorkspaceSelect}
          />
        </div>
      ) : (
        <MessageList
          messages={messages}
          isLoading={isLoading}
          hasMore={hasMoreMessages}
          isLoadingMore={isLoadingMoreMessages}
          onLoadMore={loadMoreMessages}
          pendingToolApproval={pendingToolApproval}
          onToolApprovalRespond={respondToToolApproval}
          appearanceSettings={settings?.appearance}
        />
      )}

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
