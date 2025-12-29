'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Skill, SkillSettings, SkillOverrideState } from '@/types';

interface SkillSettingsEditorProps {
  skills: Skill[];
  settings: SkillSettings;
  onChange: (settings: SkillSettings) => void;
  disabled?: boolean;
}

export function SkillSettingsEditor({
  skills,
  settings,
  onChange,
  disabled = false,
}: SkillSettingsEditorProps) {
  const handleStateChange = (skillId: string, value: SkillOverrideState) => {
    const newSettings = { ...settings };
    if (value === 'default') {
      delete newSettings[skillId];
    } else {
      newSettings[skillId] = value;
    }
    onChange(newSettings);
  };

  const getState = (skillId: string): SkillOverrideState => {
    return settings[skillId] ?? 'default';
  };

  if (skills.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Skillがまだ登録されていません。
        <br />
        設定画面からSkillsを追加してください。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {skills.map((skill) => {
        const state = getState(skill.id);

        return (
          <div
            key={skill.id}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg border',
              !skill.isEnabled && 'opacity-60'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Wand2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">
                  {skill.displayName}
                </div>
                {skill.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {skill.description}
                  </div>
                )}
              </div>
            </div>
            <RadioGroup
              value={state}
              onValueChange={(value) =>
                handleStateChange(skill.id, value as SkillOverrideState)
              }
              disabled={disabled}
              className="flex gap-3 shrink-0"
            >
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="enabled" id={`${skill.id}-enabled`} />
                <Label
                  htmlFor={`${skill.id}-enabled`}
                  className="text-xs cursor-pointer"
                >
                  有効
                </Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="disabled" id={`${skill.id}-disabled`} />
                <Label
                  htmlFor={`${skill.id}-disabled`}
                  className="text-xs cursor-pointer"
                >
                  無効
                </Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="default" id={`${skill.id}-default`} />
                <Label
                  htmlFor={`${skill.id}-default`}
                  className="text-xs cursor-pointer"
                >
                  デフォルト
                </Label>
              </div>
            </RadioGroup>
          </div>
        );
      })}
    </div>
  );
}
