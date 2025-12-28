'use client';

import { useState, useEffect } from 'react';
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
import type {
  CustomModel,
  CustomModelCreateRequest,
  StandardModel,
} from '@/types';

interface CustomModelFormProps {
  model?: CustomModel;
  supportedModels: StandardModel[];
  onSubmit: (data: CustomModelCreateRequest) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
}

export function CustomModelForm({
  model,
  supportedModels,
  onSubmit,
  onCancel,
  disabled = false,
}: CustomModelFormProps) {
  const [name, setName] = useState(model?.name ?? '');
  const [displayName, setDisplayName] = useState(model?.displayName ?? '');
  const [baseModel, setBaseModel] = useState(model?.baseModel ?? '');
  const [systemPrompt, setSystemPrompt] = useState(model?.systemPrompt ?? '');
  const [description, setDescription] = useState(model?.description ?? '');
  const [icon, setIcon] = useState(model?.icon ?? '');
  const [iconColor, setIconColor] = useState(model?.iconColor ?? '');
  const [iconImageUrl, setIconImageUrl] = useState(model?.iconImageUrl ?? '');
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
          <Label htmlFor="displayName">表示名 *</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例: コードレビューアシスタント"
            disabled={isLoading}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">識別名</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: code-reviewer"
            disabled={isLoading || !!model}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            英数字とハイフンのみ使用可能
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="baseModel">ベースモデル *</Label>
        <Select
          value={baseModel}
          onValueChange={setBaseModel}
          disabled={isLoading}
        >
          <SelectTrigger id="baseModel">
            <SelectValue placeholder="モデルを選択" />
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
        <Label htmlFor="systemPrompt">システムプロンプト</Label>
        <Textarea
          id="systemPrompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="このモデルの役割や振る舞いを定義するプロンプトを入力..."
          disabled={isLoading}
          rows={6}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例: コードの品質とベストプラクティスをレビューします"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label>アイコン</Label>
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

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading || !name || !displayName || !baseModel}>
          {model ? '更新' : '作成'}
        </Button>
      </div>
    </form>
  );
}
