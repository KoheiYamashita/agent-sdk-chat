'use client';

import { useChat } from '@/hooks/useChat';
import { useSettings } from '@/hooks/useSettings';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import type { PermissionMode } from '@/types';

interface ChatContainerProps {
  sessionId?: string;
  onMenuClick?: () => void;
}

export function ChatContainer({ sessionId, onMenuClick }: ChatContainerProps) {
  const {
    messages,
    isLoading,
    isGenerating,
    error,
    session,
    pendingToolApproval,
    sendMessage,
    stopGeneration,
    respondToToolApproval,
  } = useChat({ sessionId });

  const { settings } = useSettings();
  const defaultPermissionMode: PermissionMode = settings?.general.defaultPermissionMode ?? 'default';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ChatHeader session={session} onMenuClick={onMenuClick} />

      {error && (
        <div className="bg-destructive/10 border-destructive/20 border-b px-4 py-2 text-sm text-destructive">
          エラー: {error}
        </div>
      )}

      <MessageList
        messages={messages}
        isLoading={isLoading}
        pendingToolApproval={pendingToolApproval}
        onToolApprovalRespond={respondToToolApproval}
      />

      <InputArea
        onSubmit={sendMessage}
        onStop={stopGeneration}
        disabled={isLoading || !!pendingToolApproval}
        isGenerating={isGenerating}
        defaultPermissionMode={defaultPermissionMode}
      />
    </div>
  );
}
