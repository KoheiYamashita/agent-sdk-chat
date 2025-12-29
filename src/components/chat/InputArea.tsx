'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Square, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PermissionModeSelector } from './PermissionModeSelector';
import { ModelSelector } from './ModelSelector';
import { SkillsDropdown } from './SkillsDropdown';
import { cn } from '@/lib/utils';
import type { PermissionMode, SelectableModel, Skill, SkillSettings } from '@/types';

interface SendOptions {
  permissionMode: PermissionMode;
  model?: string;
  modelDisplayName?: string;
  systemPrompt?: string;
  skillSettings?: SkillSettings;
}

interface InputAreaProps {
  onSubmit: (message: string, options: SendOptions) => void;
  onStop?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  defaultPermissionMode?: PermissionMode;
  onTerminalToggle?: () => void;
  isTerminalOpen?: boolean;
  showTerminalButton?: boolean;
  onFilesClick?: () => void;
  thinkingEnabled?: boolean;
  onThinkingToggle?: () => void;
  // Model selection
  models?: SelectableModel[];
  selectedModel?: SelectableModel | null;
  onModelChange?: (model: SelectableModel) => void;
  isLoadingModels?: boolean;
  // Skills
  skills?: Skill[];
  skillSettings?: SkillSettings;
  customModelSkillSettings?: SkillSettings | null;
  onSkillSettingsChange?: (settings: SkillSettings) => void;
}

export function InputArea({
  onSubmit,
  onStop,
  disabled = false,
  isGenerating = false,
  defaultPermissionMode = 'default',
  onTerminalToggle,
  isTerminalOpen = false,
  showTerminalButton = false,
  onFilesClick,
  thinkingEnabled = false,
  onThinkingToggle,
  models = [],
  selectedModel = null,
  onModelChange,
  isLoadingModels = false,
  skills = [],
  skillSettings = {},
  customModelSkillSettings,
  onSkillSettingsChange,
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

    // チェックされたスキルを取得してメッセージ先頭に追加
    const selectedSkillCommands = skills
      .filter(s => skillSettings[s.id] === 'enabled')
      .map(s => s.name)
      .join(' ');

    const finalMessage = selectedSkillCommands
      ? `${selectedSkillCommands} ${trimmedInput}`
      : trimmedInput;

    // For custom models, pass the displayName; for standard models, no need to pass
    const modelDisplayName = selectedModel?.type === 'custom' ? selectedModel.displayName : undefined;
    onSubmit(finalMessage, {
      permissionMode,
      model: selectedModel?.baseModelId,
      modelDisplayName,
      systemPrompt: selectedModel?.systemPrompt ?? undefined,
      skillSettings: Object.keys(skillSettings).length > 0 ? skillSettings : undefined,
    });
    setInput('');
  }, [input, disabled, onSubmit, permissionMode, selectedModel, skills, skillSettings]);

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
    <div className="border-t border-border/50 bg-gradient-to-t from-background to-background/80 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 px-2 sm:px-4 py-2 border-b bg-muted/30">
        {onModelChange && models.length > 0 && (
          <ModelSelector
            models={models}
            selectedModelId={selectedModel?.id ?? null}
            onModelChange={onModelChange}
            disabled={disabled || isGenerating}
            isLoading={isLoadingModels}
          />
        )}
        <PermissionModeSelector
          value={permissionMode}
          onChange={setPermissionMode}
          disabled={disabled || isGenerating}
          onFilesClick={onFilesClick}
          thinkingEnabled={thinkingEnabled}
          onThinkingToggle={onThinkingToggle}
        />
        {onSkillSettingsChange && skills.length > 0 && (
          <SkillsDropdown
            skills={skills}
            skillSettings={skillSettings}
            customModelSkillSettings={customModelSkillSettings}
            onSkillSettingsChange={onSkillSettingsChange}
            disabled={disabled || isGenerating}
          />
        )}
      </div>
      <div className="p-3 sm:p-4">
          <div className="flex gap-2 items-end">
            {/* Terminal toggle button */}
            {showTerminalButton && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onTerminalToggle}
                title={isTerminalOpen ? 'ターミナルを閉じる' : 'ターミナルを開く'}
                className={cn(
                  'rounded-lg flex-shrink-0 h-10 w-10',
                  isTerminalOpen && 'bg-primary/10 text-primary'
                )}
              >
                <Terminal className="h-4 w-4" />
              </Button>
            )}

            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力... (Shift+Enter送信)"
                className="min-h-[56px] max-h-[200px] resize-none pr-14 sm:pr-16 text-sm sm:text-base bg-card/50 border-border/40 focus-visible:bg-card"
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
                    className="rounded-lg"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    onClick={handleSubmit}
                    disabled={!input.trim() || disabled}
                    title="送信"
                    className="rounded-lg"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-3 text-center hidden sm:block">
            Agent SDK Chat - Claude Agent SDK を使用
          </p>
      </div>
    </div>
  );
}
