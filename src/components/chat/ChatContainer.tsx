'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import { useSettings } from '@/hooks/useSettings';
import { useSidebar } from '@/contexts/SidebarContext';
import { useTerminal } from '@/contexts/TerminalContext';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { WorkspaceSelector } from '@/components/workspace';
import { TerminalPanel } from '@/components/terminal/TerminalPanel';
import type { PermissionMode } from '@/types';

interface ChatContainerProps {
  sessionId?: string;
}

export function ChatContainer({ sessionId }: ChatContainerProps) {
  const router = useRouter();
  const { open: openSidebar, chatResetKey } = useSidebar();
  const { isOpen: isTerminalOpen, toggleTerminal, closeTerminal, destroySession } = useTerminal();
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [workspaceDisplayPath, setWorkspaceDisplayPath] = useState<string | null>(null);
  const prevSessionIdRef = useRef<string | undefined>(undefined);

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

  // Use session.id if available, otherwise fall back to sessionId prop
  const effectiveSessionId = session?.id ?? sessionId;

  // Reset local state when chatResetKey changes (triggered by "New Chat" button)
  useEffect(() => {
    if (chatResetKey > 0) {
      setWorkspacePath(null);
      setWorkspaceDisplayPath(null);
      closeTerminal();
    }
  }, [chatResetKey, closeTerminal]);

  // Destroy terminal session when switching chat sessions
  useEffect(() => {
    const prevSessionId = prevSessionIdRef.current;
    if (prevSessionId && prevSessionId !== effectiveSessionId) {
      destroySession(prevSessionId);
      closeTerminal();
    }
    prevSessionIdRef.current = effectiveSessionId;
  }, [effectiveSessionId, destroySession, closeTerminal]);

  // Cleanup terminal session on component unmount
  useEffect(() => {
    return () => {
      const currentSessionId = prevSessionIdRef.current;
      if (currentSessionId) {
        destroySession(currentSessionId);
      }
    };
  }, [destroySession]);

  // Handle workspace selection
  const handleWorkspaceSelect = useCallback((path: string, displayPath: string) => {
    setWorkspacePath(path);
    setWorkspaceDisplayPath(displayPath);
  }, []);

  // Handle file browser open - navigate to /files page
  // Use workspaceDisplayPath (e.g., "workspace/テスト") instead of workspacePath (e.g., "テスト")
  // because the file browser API expects a path relative to cwd, not relative to the workspace base
  const handleFilesClick = useCallback(() => {
    const displayPath = session?.settings?.workspaceDisplayPath ?? workspaceDisplayPath;
    if (displayPath) {
      // Ensure path starts with "./" for consistency
      const wsPath = displayPath.startsWith('./') ? displayPath : `./${displayPath}`;
      router.push(`/files?workspace=${encodeURIComponent(wsPath)}`);
    } else {
      router.push('/files');
    }
  }, [router, session?.settings?.workspaceDisplayPath, workspaceDisplayPath]);

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
  // Get workspace path from session settings or local state (fallback to default workspace)
  const effectiveWorkspacePath = session?.settings?.workspacePath ?? workspacePath ?? '.';
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
          onTerminalToggle={toggleTerminal}
          isTerminalOpen={isTerminalOpen}
          showTerminalButton={!!effectiveSessionId}
          onFilesClick={handleFilesClick}
        />
      )}

      {/* Terminal Panel */}
      {effectiveSessionId && effectiveWorkspacePath && (
        <TerminalPanel
          chatSessionId={effectiveSessionId}
          workspacePath={effectiveWorkspacePath}
          isOpen={isTerminalOpen}
          onClose={closeTerminal}
        />
      )}
    </div>
  );
}
