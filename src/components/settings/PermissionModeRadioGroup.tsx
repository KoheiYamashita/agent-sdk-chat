'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { PermissionMode } from '@/types';

interface PermissionModeRadioGroupProps {
  value: PermissionMode;
  onChange: (mode: PermissionMode) => void;
  disabled?: boolean;
}

const modes: {
  value: PermissionMode;
  label: string;
  description: string;
  recommended?: boolean;
  warning?: boolean;
}[] = [
  {
    value: 'default',
    label: 'Default',
    description: '各ツール実行前に確認を求めます。最も安全なモードです。',
    recommended: true,
  },
  {
    value: 'acceptEdits',
    label: 'Accept Edits',
    description: 'ファイルの読み書きは自動許可し、その他のツール実行は確認を求めます。',
  },
  {
    value: 'bypassPermissions',
    label: 'Bypass Permissions',
    description: 'すべてのツール実行を自動許可します。信頼できる環境でのみ使用してください。',
    warning: true,
  },
  {
    value: 'plan',
    label: 'Plan',
    description: '計画モード。実際のツール実行は行わず、計画のみを作成します。',
  },
];

export function PermissionModeRadioGroup({
  value,
  onChange,
  disabled = false,
}: PermissionModeRadioGroupProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as PermissionMode)}
      className="space-y-3"
      disabled={disabled}
    >
      {modes.map((mode) => (
        <div key={mode.value} className="flex items-start space-x-3">
          <RadioGroupItem
            value={mode.value}
            id={`permission-mode-${mode.value}`}
            className="mt-1"
          />
          <Label
            htmlFor={`permission-mode-${mode.value}`}
            className="flex-1 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{mode.label}</span>
              {mode.recommended && (
                <Badge variant="secondary" className="text-xs">
                  推奨
                </Badge>
              )}
              {mode.warning && (
                <Badge variant="destructive" className="text-xs">
                  注意
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {mode.description}
            </p>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
