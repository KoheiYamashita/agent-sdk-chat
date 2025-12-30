'use client';

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
          ワークスペースパス
        </Label>
        <Input
          id="workspace-path"
          value={settings.workspacePath}
          onChange={(e) => handleWorkspacePathChange(e.target.value)}
          disabled={disabled}
          placeholder="./workspace"
        />
        <p className="text-xs text-muted-foreground">
          Claude Codeが動作するディレクトリを指定します。相対パス（./workspace）または絶対パス（/path/to/workspace）が使用できます。
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="claude-md-template" className="text-sm font-medium">
          CLAUDE.md テンプレート
        </Label>
        <Textarea
          id="claude-md-template"
          value={settings.claudeMdTemplate ?? DEFAULT_WORKSPACE_CLAUDE_MD}
          onChange={(e) => handleClaudeMdTemplateChange(e.target.value)}
          disabled={disabled}
          placeholder="ワークスペースのCLAUDE.mdテンプレート..."
          rows={10}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          新しいワークスペースにCLAUDE.mdが存在しない場合、このテンプレートから自動作成されます。
          既存のCLAUDE.mdは上書きされません。
        </p>
      </div>
    </div>
  );
}
