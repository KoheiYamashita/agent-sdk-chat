'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Skill, SkillCreateRequest } from '@/types';

interface SkillFormProps {
  skill?: Skill;
  onSubmit: (data: SkillCreateRequest) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
}

const DEFAULT_SKILL_TEMPLATE = `---
name: skill-name
description: Describe when this skill should be used and what it does.
---

# Skill Title

## Instructions

Provide instructions for the skill here.
`;

export function SkillForm({
  skill,
  onSubmit,
  onCancel,
  disabled = false,
}: SkillFormProps) {
  const t = useTranslations('skills');
  const tCommon = useTranslations('common');
  const [name, setName] = useState(skill?.name ?? '');
  const [displayName, setDisplayName] = useState(skill?.displayName ?? '');
  const [description, setDescription] = useState(skill?.description ?? '');
  const [content, setContent] = useState(skill?.content ?? DEFAULT_SKILL_TEMPLATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate name from displayName
  useEffect(() => {
    if (!skill && displayName) {
      const generatedName = displayName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setName(generatedName);
    }
  }, [displayName, skill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !displayName || !content) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        displayName,
        description: description || undefined,
        content,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = disabled || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">{t('displayNameRequired')}</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('displayNamePlaceholder')}
            disabled={isLoading}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">{t('identifier')}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('identifierPlaceholder')}
            disabled={isLoading || !!skill}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t('identifierHint')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('descriptionLabel')}</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">
          {t('contentRequired')}
          <span className="ml-2 text-xs text-muted-foreground font-normal">
            YAML frontmatter + Markdown
          </span>
        </Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="---\nname: skill-name\ndescription: ...\n---\n\n# Skill Title\n\n..."
          disabled={isLoading}
          rows={12}
          className="font-mono text-sm"
          required
        />
        <p className="text-xs text-muted-foreground">
          {t('contentHint')}
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {tCommon('cancel')}
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !name || !displayName || !content}
        >
          {skill ? t('update') : tCommon('create')}
        </Button>
      </div>
    </form>
  );
}
