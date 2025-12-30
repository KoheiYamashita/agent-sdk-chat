'use client';

import { useTranslations } from 'next-intl';
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
import { Shield, FileEdit, Zap, ClipboardList, FolderOpen, Brain } from 'lucide-react';

interface PermissionModeSelectorProps {
  value: PermissionMode;
  onChange: (mode: PermissionMode) => void;
  disabled?: boolean;
  onFilesClick?: () => void;
  thinkingEnabled?: boolean;
  onThinkingToggle?: () => void;
}

interface ModeConfig {
  value: PermissionMode;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'warning' | 'destructive';
}

const modeConfigs: ModeConfig[] = [
  {
    value: 'default',
    shortLabel: 'Default',
    icon: Shield,
    variant: 'default',
  },
  {
    value: 'acceptEdits',
    shortLabel: 'Accept Edits',
    icon: FileEdit,
    variant: 'default',
  },
  {
    value: 'bypassPermissions',
    shortLabel: 'Bypass',
    icon: Zap,
    variant: 'destructive',
  },
  {
    value: 'plan',
    shortLabel: 'Plan',
    icon: ClipboardList,
    variant: 'default',
  },
];

export function PermissionModeSelector({
  value,
  onChange,
  disabled = false,
  onFilesClick,
  thinkingEnabled = false,
  onThinkingToggle,
}: PermissionModeSelectorProps) {
  const t = useTranslations('chat');
  const tSettings = useTranslations('settings.permissionMode');
  const currentMode = modeConfigs.find((m) => m.value === value) ?? modeConfigs[0];
  const isDestructive = currentMode.variant === 'destructive';

  // Get localized labels for modes
  const getModeLabel = (modeValue: PermissionMode): string => {
    switch (modeValue) {
      case 'default':
        return tSettings('default.label');
      case 'acceptEdits':
        return tSettings('acceptEdits.label');
      case 'bypassPermissions':
        return tSettings('bypassPermissions.label');
      case 'plan':
        return tSettings('plan.label');
      default:
        return modeValue;
    }
  };

  return (
    <>
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
          <SelectValue placeholder={t('selectPermission')} />
        </SelectTrigger>
        <SelectContent>
          {modeConfigs.map((mode) => {
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
                    <span>{getModeLabel(mode.value)}</span>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {onThinkingToggle && (
        <Button
          variant={thinkingEnabled ? 'default' : 'ghost'}
          size="sm"
          onClick={onThinkingToggle}
          disabled={disabled}
          className={cn(
            'h-8 shrink-0 gap-1.5 text-xs',
            thinkingEnabled && 'bg-primary/10 text-primary hover:bg-primary/20'
          )}
          title={thinkingEnabled ? t('thinkingOn') : t('thinkingOff')}
        >
          <Brain className="h-4 w-4" />
          <span className="hidden sm:inline">Thinking</span>
        </Button>
      )}
      {onFilesClick && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onFilesClick}
          disabled={disabled}
          className="h-8 shrink-0 gap-1.5 text-xs"
          title={t('openFile')}
        >
          <FolderOpen className="h-4 w-4" />
          <span>{t('file')}</span>
        </Button>
      )}
    </>
  );
}
