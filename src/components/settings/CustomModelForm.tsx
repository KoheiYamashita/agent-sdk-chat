'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconPicker } from './IconPicker';
import { SkillSettingsEditor } from './SkillSettingsEditor';
import type {
  CustomModel,
  CustomModelCreateRequest,
  StandardModel,
  Skill,
  SkillSettings,
} from '@/types';

interface CustomModelFormProps {
  model?: CustomModel;
  supportedModels: StandardModel[];
  skills?: Skill[];
  onSubmit: (data: CustomModelCreateRequest) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
}

export function CustomModelForm({
  model,
  supportedModels,
  skills = [],
  onSubmit,
  onCancel,
  disabled = false,
}: CustomModelFormProps) {
  const t = useTranslations('models');
  const tCommon = useTranslations('common');
  const [name, setName] = useState(model?.name ?? '');
  const [displayName, setDisplayName] = useState(model?.displayName ?? '');
  const [baseModel, setBaseModel] = useState(model?.baseModel ?? '');
  const [systemPrompt, setSystemPrompt] = useState(model?.systemPrompt ?? '');
  const [description, setDescription] = useState(model?.description ?? '');
  const [icon, setIcon] = useState(model?.icon ?? '');
  const [iconColor, setIconColor] = useState(model?.iconColor ?? '');
  const [iconImageUrl, setIconImageUrl] = useState(model?.iconImageUrl ?? '');
  const [skillSettings, setSkillSettings] = useState<SkillSettings>(
    model?.skillSettings ?? {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate name from displayName
  useEffect(() => {
    if (!model && displayName) {
      const generatedName = displayName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setName(generatedName);
    }
  }, [displayName, model]);

  // Set default base model
  useEffect(() => {
    if (!baseModel && supportedModels.length > 0) {
      setBaseModel(supportedModels[0].id);
    }
  }, [baseModel, supportedModels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !displayName || !baseModel) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        displayName,
        baseModel,
        systemPrompt: systemPrompt || undefined,
        description: description || undefined,
        icon: icon || undefined,
        iconColor: iconColor || undefined,
        iconImageUrl: iconImageUrl || undefined,
        skillSettings: Object.keys(skillSettings).length > 0 ? skillSettings : undefined,
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
            disabled={isLoading || !!model}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t('identifierHint')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="baseModel">{t('baseModel')} *</Label>
        <Select
          value={baseModel}
          onValueChange={setBaseModel}
          disabled={isLoading}
        >
          <SelectTrigger id="baseModel">
            <SelectValue placeholder={t('selectModel')} />
          </SelectTrigger>
          <SelectContent>
            {supportedModels.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="systemPrompt">{t('systemPrompt')}</Label>
        <Textarea
          id="systemPrompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder={t('systemPromptPlaceholder')}
          disabled={isLoading}
          rows={6}
          className="font-mono text-sm"
        />
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
        <Label>{t('icon')}</Label>
        <IconPicker
          value={icon}
          color={iconColor}
          imageUrl={iconImageUrl}
          onChange={(newIcon, newColor, newImageUrl) => {
            setIcon(newIcon);
            setIconColor(newColor);
            setIconImageUrl(newImageUrl ?? '');
          }}
          disabled={isLoading}
        />
      </div>

      {skills.length > 0 && (
        <div className="space-y-2">
          <Label>{t('skillsSettings')}</Label>
          <p className="text-xs text-muted-foreground mb-2">
            {t('skillsSettingsHint')}
          </p>
          <SkillSettingsEditor
            skills={skills}
            settings={skillSettings}
            onChange={setSkillSettings}
            disabled={isLoading}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {tCommon('cancel')}
        </Button>
        <Button type="submit" disabled={isLoading || !name || !displayName || !baseModel}>
          {model ? t('update') : tCommon('create')}
        </Button>
      </div>
    </form>
  );
}
