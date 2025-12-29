'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, Type } from 'lucide-react';
import type { TitleGenerationSettings, StandardModel } from '@/types';

interface TitleGenerationSettingsFormProps {
  settings: TitleGenerationSettings;
  models: StandardModel[];
  onChange: (settings: TitleGenerationSettings) => void;
  disabled?: boolean;
}

export function TitleGenerationSettingsForm({
  settings,
  models,
  onChange,
  disabled = false,
}: TitleGenerationSettingsFormProps) {
  const handleEnabledChange = (checked: boolean) => {
    onChange({
      ...settings,
      enabled: checked,
    });
  };

  const handleModelChange = (value: string) => {
    onChange({
      ...settings,
      model: value === 'auto' ? '' : value,
    });
  };

  const handlePromptChange = (value: string) => {
    onChange({
      ...settings,
      prompt: value,
    });
  };

  // Find Haiku models for auto-select hint
  const haikuModels = models.filter(m =>
    m.id.toLowerCase().includes('haiku') ||
    m.displayName.toLowerCase().includes('haiku')
  );
  const defaultHaikuName = haikuModels[0]?.displayName || 'Haiku';

  return (
    <div className="space-y-6">
      <div className="flex items-start space-x-3">
        <Checkbox
          id="title-gen-enabled"
          checked={settings.enabled}
          onCheckedChange={handleEnabledChange}
          disabled={disabled}
          className="mt-1"
        />
        <Label htmlFor="title-gen-enabled" className="flex-1 cursor-pointer">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-primary" />
            <span className="font-medium">タイトル自動生成</span>
            <Badge variant="secondary" className="text-xs">
              推奨
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            新規チャット開始時、最初のアシスタント応答後にタイトルを自動生成します。
          </p>
        </Label>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title-gen-model" className="text-sm font-medium flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            使用モデル
          </Label>
          <Select
            value={settings.model || 'auto'}
            onValueChange={handleModelChange}
            disabled={disabled || !settings.enabled}
          >
            <SelectTrigger id="title-gen-model" className="w-full">
              <SelectValue placeholder="モデルを選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <div className="flex items-center gap-2">
                  <span>自動（{defaultHaikuName}）</span>
                </div>
              </SelectItem>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            タイトル生成に使用するモデルを選択します。軽量なHaikuモデルがおすすめです。
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title-gen-prompt" className="text-sm font-medium">
            プロンプトテンプレート
          </Label>
          <Textarea
            id="title-gen-prompt"
            value={settings.prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            disabled={disabled || !settings.enabled}
            placeholder="タイトル生成用のプロンプト..."
            className="min-h-[200px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            <code className="bg-muted px-1 py-0.5 rounded">&lt;chat_history&gt;</code>
            はユーザーメッセージとアシスタント応答に置換されます。
            出力はJSON形式 <code className="bg-muted px-1 py-0.5 rounded">{`{ "title": "..." }`}</code> を想定しています。
          </p>
        </div>
      </div>
    </div>
  );
}
