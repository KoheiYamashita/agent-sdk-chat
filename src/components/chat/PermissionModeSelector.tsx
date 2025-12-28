'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PermissionMode } from '@/types';
import { Shield, FileEdit, Zap, ClipboardList, FolderOpen } from 'lucide-react';

interface PermissionModeSelectorProps {
  value: PermissionMode;
  onChange: (mode: PermissionMode) => void;
  disabled?: boolean;
  onFilesClick?: () => void;
}

const modes: {
  value: PermissionMode;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  variant: 'default' | 'warning' | 'destructive';
}[] = [
  {
    value: 'default',
    label: 'Default - 各操作を確認',
    shortLabel: 'Default',
    icon: Shield,
    description: '各ツール実行前に確認を求めます',
    variant: 'default',
  },
  {
    value: 'acceptEdits',
    label: 'Accept Edits - 編集は自動許可',
    shortLabel: 'Accept Edits',
    icon: FileEdit,
    description: 'ファイル編集は自動許可、その他は確認',
    variant: 'default',
  },
  {
    value: 'bypassPermissions',
    label: 'Bypass - すべて自動許可',
    shortLabel: 'Bypass',
    icon: Zap,
    description: 'すべてのツール実行を自動許可（注意）',
    variant: 'destructive',
  },
  {
    value: 'plan',
    label: 'Plan - 計画のみ作成',
    shortLabel: 'Plan',
    icon: ClipboardList,
    description: '実行せず計画のみ作成',
    variant: 'default',
  },
];

export function PermissionModeSelector({
  value,
  onChange,
  disabled = false,
  onFilesClick,
}: PermissionModeSelectorProps) {
  const currentMode = modes.find((m) => m.value === value) ?? modes[0];
  const isDestructive = currentMode.variant === 'destructive';

  return (
    <div className="flex items-center gap-2 px-2 sm:px-4 py-2 border-b bg-muted/30">
      <Select
        value={value}
        onValueChange={(v) => onChange(v as PermissionMode)}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            'w-[140px] sm:w-[220px] h-8 text-xs',
            isDestructive && 'border-destructive/50 text-destructive'
          )}
        >
          <SelectValue placeholder="権限モードを選択" />
        </SelectTrigger>
        <SelectContent>
          {modes.map((mode) => {
            const ModeIcon = mode.icon;
            return (
              <SelectItem
                key={mode.value}
                value={mode.value}
                className={cn(
                  'text-xs',
                  mode.variant === 'destructive' && 'text-destructive focus:text-destructive'
                )}
              >
                <div className="flex items-center gap-2">
                  <ModeIcon className="h-3.5 w-3.5" />
                  <div className="flex flex-col">
                    <span>{mode.label}</span>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {onFilesClick && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onFilesClick}
          disabled={disabled}
          className="h-8 shrink-0 gap-1.5 text-xs"
          title="ファイルを開く"
        >
          <FolderOpen className="h-4 w-4" />
          <span>ファイル</span>
        </Button>
      )}
    </div>
  );
}
