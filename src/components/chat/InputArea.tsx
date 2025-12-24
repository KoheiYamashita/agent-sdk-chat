'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PermissionModeSelector } from './PermissionModeSelector';
import type { PermissionMode } from '@/types';

interface SendOptions {
  permissionMode: PermissionMode;
}

interface InputAreaProps {
  onSubmit: (message: string, options: SendOptions) => void;
  onStop?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  defaultPermissionMode?: PermissionMode;
}

export function InputArea({
  onSubmit,
  onStop,
  disabled = false,
  isGenerating = false,
  defaultPermissionMode = 'default',
}: InputAreaProps) {
  const [input, setInput] = useState('');
  const [permissionMode, setPermissionMode] = useState<PermissionMode>(defaultPermissionMode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // デフォルト値が変更されたら追従
  useEffect(() => {
    setPermissionMode(defaultPermissionMode);
  }, [defaultPermissionMode]);

  const handleSubmit = useCallback(() => {
    const trimmedInput = input.trim();
    if (!trimmedInput || disabled) return;
    onSubmit(trimmedInput, { permissionMode });
    setInput('');
  }, [input, disabled, onSubmit, permissionMode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleStopClick = useCallback(() => {
    onStop?.();
  }, [onStop]);

  return (
    <div className="border-t bg-background">
      <PermissionModeSelector
        value={permissionMode}
        onChange={setPermissionMode}
        disabled={disabled || isGenerating}
      />
      <div className="p-2 sm:p-4">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力... (Shift+Enter送信)"
              className="min-h-[60px] max-h-[200px] resize-none pr-12 sm:pr-14 text-sm sm:text-base"
              disabled={disabled || isGenerating}
              rows={1}
            />
            <div className="absolute right-2 bottom-2">
              {isGenerating ? (
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={handleStopClick}
                  title="生成を停止"
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={handleSubmit}
                  disabled={!input.trim() || disabled}
                  title="送信"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center hidden sm:block">
            Claude Code Web UI - Claude Agent SDK を使用
          </p>
      </div>
    </div>
  );
}
