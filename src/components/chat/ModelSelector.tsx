'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { isValidImageUrl } from '@/lib/image-utils';
import {
  Bot,
  Brain,
  Code,
  Sparkles,
  Wand2,
  MessageCircle,
  Zap,
  Star,
  Lightbulb,
  BookOpen,
  FileCode,
  Shield,
  Target,
  Rocket,
  Settings,
} from 'lucide-react';
import type { SelectableModel } from '@/types';

interface ModelSelectorProps {
  models: SelectableModel[];
  selectedModelId: string | null;
  onModelChange: (model: SelectableModel) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  bot: Bot,
  brain: Brain,
  code: Code,
  sparkles: Sparkles,
  wand: Wand2,
  message: MessageCircle,
  zap: Zap,
  star: Star,
  lightbulb: Lightbulb,
  book: BookOpen,
  'file-code': FileCode,
  shield: Shield,
  target: Target,
  rocket: Rocket,
};

// Component to render model icon (image or lucide icon)
function ModelIcon({
  model,
  className,
}: {
  model: SelectableModel;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const hasValidImage = isValidImageUrl(model.iconImageUrl) && !imageError;

  if (hasValidImage && model.iconImageUrl) {
    return (
      <Image
        src={model.iconImageUrl}
        alt=""
        width={14}
        height={14}
        className={cn('rounded object-cover', className)}
        onError={() => setImageError(true)}
        unoptimized
      />
    );
  }

  const IconComponent = model.icon ? ICON_MAP[model.icon] ?? Bot : Bot;
  return (
    <IconComponent
      className={cn(className, model.iconColor ?? 'text-primary')}
    />
  );
}

// Short display name for models
function getShortDisplayName(model: SelectableModel): string {
  const { displayName } = model;
  // Shorten common model names
  if (displayName.includes('Opus')) return displayName.replace('Claude ', '').replace('4.5 ', '');
  if (displayName.includes('Sonnet')) return displayName.replace('Claude ', '').replace('4 ', '').replace('3.5 ', '');
  if (displayName.includes('Haiku')) return displayName.replace('Claude ', '').replace('3.5 ', '');
  // For custom models, use as-is but truncate if too long
  return displayName.length > 15 ? displayName.slice(0, 12) + '...' : displayName;
}

export function ModelSelector({
  models,
  selectedModelId,
  onModelChange,
  disabled = false,
  isLoading = false,
}: ModelSelectorProps) {
  const t = useTranslations('chat');
  const { standardModels, customModels } = useMemo(() => {
    return {
      standardModels: models.filter((m) => m.type === 'standard'),
      customModels: models.filter((m) => m.type === 'custom'),
    };
  }, [models]);

  const selectedModel = models.find((m) => m.id === selectedModelId) ?? standardModels[0];

  const handleValueChange = (value: string) => {
    const model = models.find((m) => m.id === value);
    if (model) {
      onModelChange(model);
    }
  };

  return (
    <Select
      value={selectedModel?.id ?? ''}
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger
        className={cn(
          'w-[140px] sm:w-[180px] h-8 text-xs',
          selectedModel?.type === 'custom' && 'border-primary/50'
        )}
      >
        <SelectValue>
          <div className="flex items-center gap-2">
            {selectedModel?.type === 'custom' ? (
              <ModelIcon model={selectedModel} className="h-3.5 w-3.5" />
            ) : (
              <Bot className="h-3.5 w-3.5 text-foreground" />
            )}
            <span className="truncate">
              {selectedModel ? getShortDisplayName(selectedModel) : t('selectModel')}
            </span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{t('standardModels')}</SelectLabel>
          {standardModels.map((model) => (
            <SelectItem key={model.id} value={model.id} className="text-xs">
              <div className="flex items-center gap-2">
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span>{model.displayName}</span>
                  {model.description && (
                    <span className="text-xs text-muted-foreground">
                      {model.description}
                    </span>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>

        {customModels.length > 0 && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>{t('customModels')}</SelectLabel>
              {customModels.map((model) => (
                <SelectItem key={model.id} value={model.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <ModelIcon model={model} className="h-3.5 w-3.5" />
                    <div className="flex flex-col">
                      <span>{model.displayName}</span>
                      {model.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {model.description}
                        </span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}

        <SelectSeparator />
        <div className="px-2 py-1.5">
          <Link
            href="/settings/models"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            {t('manageModels')}
          </Link>
        </div>
      </SelectContent>
    </Select>
  );
}
