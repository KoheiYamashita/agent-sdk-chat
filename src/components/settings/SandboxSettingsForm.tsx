'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_WORKSPACE_CLAUDE_MD } from '@/lib/constants/workspace-claude-md';
import type { SandboxSettings } from '@/types';

interface SandboxSettingsFormProps {
  settings: SandboxSettings;
  onChange: (settings: SandboxSettings) => void;
  disabled?: boolean;
}

export function SandboxSettingsForm({
  settings,
  onChange,
  disabled = false,
}: SandboxSettingsFormProps) {
  const t = useTranslations('settings.sandbox');

  const handleWorkspacePathChange = (value: string) => {
    onChange({
      ...settings,
      workspacePath: value,
    });
  };

  const handleClaudeMdTemplateChange = (value: string) => {
    onChange({
      ...settings,
      claudeMdTemplate: value,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="workspace-path" className="text-sm font-medium">
          {t('workspacePath')}
        </Label>
        <Input
          id="workspace-path"
          value={settings.workspacePath}
          onChange={(e) => handleWorkspacePathChange(e.target.value)}
          disabled={disabled}
          placeholder={t('workspacePathPlaceholder')}
        />
        <p className="text-xs text-muted-foreground">
          {t('workspacePathDescription')}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="claude-md-template" className="text-sm font-medium">
          {t('claudeMdTemplate')}
        </Label>
        <Textarea
          id="claude-md-template"
          value={settings.claudeMdTemplate ?? DEFAULT_WORKSPACE_CLAUDE_MD}
          onChange={(e) => handleClaudeMdTemplateChange(e.target.value)}
          disabled={disabled}
          placeholder={t('claudeMdTemplatePlaceholder')}
          rows={10}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          {t('claudeMdTemplateDescription')}
        </p>
      </div>
    </div>
  );
}
