'use client';

import { useTranslations } from 'next-intl';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { PermissionMode } from '@/types';

interface PermissionModeRadioGroupProps {
  value: PermissionMode;
  onChange: (mode: PermissionMode) => void;
  disabled?: boolean;
}

const modeKeys = ['default', 'acceptEdits', 'bypassPermissions', 'plan'] as const;

export function PermissionModeRadioGroup({
  value,
  onChange,
  disabled = false,
}: PermissionModeRadioGroupProps) {
  const t = useTranslations('settings.permissionMode');

  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as PermissionMode)}
      className="space-y-3"
      disabled={disabled}
    >
      {modeKeys.map((modeKey) => (
        <div key={modeKey} className="flex items-start space-x-3">
          <RadioGroupItem
            value={modeKey}
            id={`permission-mode-${modeKey}`}
            className="mt-1"
          />
          <Label
            htmlFor={`permission-mode-${modeKey}`}
            className="flex-1 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{t(`${modeKey}.label`)}</span>
              {modeKey === 'acceptEdits' && (
                <Badge variant="secondary" className="text-xs">
                  {t('acceptEdits.recommended')}
                </Badge>
              )}
              {modeKey === 'bypassPermissions' && (
                <Badge variant="destructive" className="text-xs">
                  {t('bypassPermissions.warning')}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t(`${modeKey}.description`)}
            </p>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
