'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Wand2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Skill, SkillSettings } from '@/types';
import { resolveSkillEnabled } from '@/types/skills';

interface SkillsDropdownProps {
  skills: Skill[];
  skillSettings: SkillSettings;
  customModelSkillSettings?: SkillSettings | null;
  onSkillSettingsChange: (settings: SkillSettings) => void;
  disabled?: boolean;
}

export function SkillsDropdown({
  skills,
  skillSettings,
  customModelSkillSettings,
  onSkillSettingsChange,
  disabled = false,
}: SkillsDropdownProps) {
  const t = useTranslations('chat');
  const [open, setOpen] = useState(false);

  // Filter skills: show only skills that are enabled (considering global and customModel settings)
  // Session settings are used for checking, not for filtering visibility
  const availableSkills = useMemo(() => {
    return skills.filter((skill) => {
      // Check if skill is enabled based on global and customModel settings
      const resolved = resolveSkillEnabled(skill, customModelSkillSettings, null);
      return resolved.isEnabled;
    });
  }, [skills, customModelSkillSettings]);

  // Skill is checked only when explicitly set to 'enabled' in session settings
  const isSkillChecked = (skill: Skill): boolean => {
    return skillSettings[skill.id] === 'enabled';
  };

  // Calculate enabled skills count
  const enabledCount = availableSkills.filter((skill) => isSkillChecked(skill)).length;

  const handleSkillToggle = (skillId: string, checked: boolean) => {
    const newSettings = { ...skillSettings };
    if (checked) {
      newSettings[skillId] = 'enabled';
    } else {
      // Remove from settings (back to default: off)
      delete newSettings[skillId];
    }
    onSkillSettingsChange(newSettings);
  };

  if (availableSkills.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs',
            enabledCount > 0 && 'bg-primary/10 border-primary/30'
          )}
          disabled={disabled}
        >
          <Wand2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Skills</span>
          {enabledCount > 0 && (
            <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px] font-medium">
              {enabledCount}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Skills ({t('skillsEnabled', { count: enabledCount, total: availableSkills.length })})
          </div>
          {availableSkills.map((skill) => {
            const checked = isSkillChecked(skill);
            return (
              <div
                key={skill.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer"
                onClick={() => handleSkillToggle(skill.id, !checked)}
              >
                <Checkbox
                  id={`skill-${skill.id}`}
                  checked={checked}
                  onCheckedChange={(c) => handleSkillToggle(skill.id, c === true)}
                  disabled={disabled}
                  className="pointer-events-none"
                />
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={`skill-${skill.id}`}
                    className="text-sm cursor-pointer truncate block"
                  >
                    {skill.displayName}
                  </Label>
                  {skill.description && (
                    <span className="text-[10px] text-muted-foreground truncate block">
                      {skill.description}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
