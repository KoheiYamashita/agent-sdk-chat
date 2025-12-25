'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  const handleEnabledChange = (checked: boolean) => {
    onChange({
      ...settings,
      enabled: checked,
    });
  };

  const handleWorkspacePathChange = (value: string) => {
    onChange({
      ...settings,
      workspacePath: value,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start space-x-3">
        <Checkbox
          id="sandbox-enabled"
          checked={settings.enabled}
          onCheckedChange={handleEnabledChange}
          disabled={disabled}
          className="mt-1"
        />
        <Label htmlFor="sandbox-enabled" className="flex-1 cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="font-medium">サンドボックスモード</span>
            <Badge variant="secondary" className="text-xs">
              推奨
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Claude Codeを指定したワークスペース内で実行し、システムへのアクセスを制限します。
          </p>
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="workspace-path" className="text-sm font-medium">
          ワークスペースパス
        </Label>
        <Input
          id="workspace-path"
          value={settings.workspacePath}
          onChange={(e) => handleWorkspacePathChange(e.target.value)}
          disabled={disabled || !settings.enabled}
          placeholder="./workspace"
        />
        <p className="text-xs text-muted-foreground">
          Claude Codeが動作するディレクトリを指定します。相対パス（./workspace）または絶対パス（/path/to/workspace）が使用できます。
        </p>
      </div>
    </div>
  );
}
