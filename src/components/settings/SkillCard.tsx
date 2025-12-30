'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Edit2, Trash2, Wand2 } from 'lucide-react';
import type { Skill } from '@/types';

interface SkillCardProps {
  skill: Skill;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
  disabled?: boolean;
}

export function SkillCard({
  skill,
  onEdit,
  onDelete,
  onToggleEnabled,
  disabled = false,
}: SkillCardProps) {
  const t = useTranslations('skills');
  // Extract first line of content as preview (skip YAML frontmatter)
  const getContentPreview = (content: string): string => {
    const lines = content.split('\n');
    let inFrontmatter = false;
    for (const line of lines) {
      if (line.trim() === '---') {
        inFrontmatter = !inFrontmatter;
        continue;
      }
      if (!inFrontmatter && line.trim()) {
        // Return first non-empty line after frontmatter
        return line.trim().replace(/^#+\s*/, '').slice(0, 100);
      }
    }
    return '';
  };

  const preview = getContentPreview(skill.content);

  return (
    <div
      className={cn(
        'flex items-start justify-between p-4 rounded-lg border transition-colors',
        skill.isEnabled
          ? 'bg-card hover:bg-accent/50'
          : 'bg-muted/30 opacity-60'
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
            skill.isEnabled ? 'bg-primary/10' : 'bg-muted'
          )}
        >
          <Wand2
            className={cn(
              'h-5 w-5',
              skill.isEnabled ? 'text-primary' : 'text-muted-foreground'
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{skill.displayName}</h4>
            {!skill.isEnabled && (
              <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                {t('disabled')}
              </span>
            )}
          </div>
          {skill.description && (
            <p className="text-sm text-muted-foreground truncate">
              {skill.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
            {skill.name}
          </p>
          {preview && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {preview}
              {preview.length >= 100 && '...'}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4 shrink-0">
        <Switch
          checked={skill.isEnabled}
          onCheckedChange={onToggleEnabled}
          disabled={disabled}
          aria-label={skill.isEnabled ? t('disable') : t('enable')}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          disabled={disabled}
          className="h-8 w-8"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={disabled}
          className="h-8 w-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
