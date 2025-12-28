'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import { useSettings } from '@/hooks/useSettings';
import { useAllModels } from '@/hooks/useModels';
import { useSidebar } from '@/contexts/SidebarContext';
import { useTerminal } from '@/contexts/TerminalContext';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { WorkspaceSelector } from '@/components/workspace';
import { TerminalPanel } from '@/components/terminal/TerminalPanel';
import type { PermissionMode, SelectableModel } from '@/types';

interface ChatContainerProps {
  sessionId?: string;
}

export function ChatContainer({ sessionId }: ChatContainerProps) {
  const router = useRouter();
  const { open: openSidebar, chatResetKey } = useSidebar();
  const { isOpen: isTerminalOpen, toggleTerminal, closeTerminal, destroySession } = useTerminal();
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [workspaceDisplayPath, setWorkspaceDisplayPath] = useState<string | null>(null);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [selectedModel, setSelectedModel] = useState<SelectableModel | null>(null);
  const [modelInitialized, setModelInitialized] = useState(false);
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
    streamingThinking,
    loadMoreMessages,
    sendMessage: originalSendMessage,
    stopGeneration,
    respondToToolApproval,
  } = useChat({ sessionId, resetKey: chatResetKey });

  const { settings } = useSettings();
  const { selectableModels, customModels, isLoading: isLoadingModels } = useAllModels();
  const defaultPermissionMode: PermissionMode = settings?.general.defaultPermissionMode ?? 'default';

  // Reset model initialization when session changes
  useEffect(() => {
    setModelInitialized(false);
    setSelectedModel(null);
  }, [sessionId]);

  // Set model when session is loaded
  useEffect(() => {
    // Wait for models to load
    if (selectableModels.length === 0) return;
    // Already initialized for this session
    if (modelInitialized) return;
    // For existing sessions, wait for messages to be loaded
    // We know messages are loaded when either:
    // - isLoading is false AND messages exist, OR
    // - isLoading is false AND this is a new chat (no sessionId)
    if (sessionId) {
      // For existing sessions, wait until loading is complete
      if (isLoading) return;
      // Also wait until messages are actually populated (not just loading complete)
      // This handles the race condition between TanStack Query and state update
      if (messages.length === 0) {
        // But don't wait forever - if session exists but has no messages yet, proceed
        // Check if we have a session object (meaning API call completed)
        if (!session) return;
      }
    }

    let modelToUse: SelectableModel | undefined;

    // First, try to use the model from the last assistant message in this session
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAssistantMessage) {
      // If custom model was used, find by displayName
      if (lastAssistantMessage.modelDisplayName) {
        modelToUse = selectableModels.find(
          (m) => m.type === 'custom' && m.displayName === lastAssistantMessage.modelDisplayName
        );
      }
      // If not found or standard model, find by base model ID
      if (!modelToUse && lastAssistantMessage.model) {
        modelToUse = selectableModels.find(
          (m) => m.baseModelId === lastAssistantMessage.model
        );
      }
    }

    // Fall back to default model from settings
    if (!modelToUse) {
      const defaultModelId = settings?.general.defaultModel;
      modelToUse = defaultModelId
        ? selectableModels.find((m) => m.id === defaultModelId)
        : undefined;
    }

    // Fall back to the first standard model
    if (!modelToUse) {
      modelToUse = selectableModels.find((m) => m.type === 'standard') ?? selectableModels[0];
    }

    setSelectedModel(modelToUse);
    setModelInitialized(true);
  }, [sessionId, modelInitialized, selectableModels, messages, isLoading, session, settings?.general.defaultModel]);

  // Handle model change
  const handleModelChange = useCallback((model: SelectableModel) => {
    setSelectedModel(model);
  }, []);

  // Initialize thinking state from settings
  useEffect(() => {
    if (settings?.general.defaultThinkingEnabled !== undefined) {
      setThinkingEnabled(settings.general.defaultThinkingEnabled);
    }
  }, [settings?.general.defaultThinkingEnabled]);

  // Toggle thinking mode
  const handleThinkingToggle = useCallback(() => {
    setThinkingEnabled((prev) => !prev);
  }, []);

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
    const params = new URLSearchParams();
    if (displayPath) {
      // Ensure path starts with "./" for consistency
      const wsPath = displayPath.startsWith('./') ? displayPath : `./${displayPath}`;
      params.set('workspace', wsPath);
    }
    // Pass return URL so the files page can navigate back to the correct session
    if (effectiveSessionId) {
      params.set('returnTo', `/chat/${effectiveSessionId}`);
    }
    const query = params.toString();
    router.push(query ? `/files?${query}` : '/files');
  }, [router, session?.settings?.workspaceDisplayPath, workspaceDisplayPath, effectiveSessionId]);

  // Wrap sendMessage to include workspacePath, displayPath, thinkingEnabled, and model
  const sendMessage = useCallback(
    (message: string, options: { permissionMode: PermissionMode; model?: string; modelDisplayName?: string; systemPrompt?: string }) => {
      originalSendMessage(message, {
        ...options,
        workspacePath: workspacePath ?? undefined,
        workspaceDisplayPath: workspaceDisplayPath ?? undefined,
        thinkingEnabled,
      });
    },
    [originalSendMessage, workspacePath, workspaceDisplayPath, thinkingEnabled]
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
          streamingThinking={streamingThinking}
          customModels={customModels}
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
          thinkingEnabled={thinkingEnabled}
          onThinkingToggle={handleThinkingToggle}
          models={selectableModels}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          isLoadingModels={isLoadingModels}
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
