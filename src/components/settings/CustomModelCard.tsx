'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { isValidImageUrl } from '@/lib/image-utils';
import { Edit2, Trash2, Bot, Brain, Code, Sparkles, Wand2, MessageCircle, Zap, Star, Lightbulb, BookOpen, FileCode, Shield, Target, Rocket } from 'lucide-react';
import type { CustomModel } from '@/types';

interface CustomModelCardProps {
  model: CustomModel;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
  disabled?: boolean;
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

export function CustomModelCard({
  model,
  onEdit,
  onDelete,
  onToggleEnabled,
  disabled = false,
}: CustomModelCardProps) {
  const [imageError, setImageError] = useState(false);
  const IconComponent = model.icon ? ICON_MAP[model.icon] : Bot;
  const iconColor = model.iconColor || 'text-primary';
  const hasValidImage = isValidImageUrl(model.iconImageUrl) && !imageError;

  return (
    <div
      className={cn(
        'flex items-start justify-between p-4 rounded-lg border transition-colors',
        model.isEnabled
          ? 'bg-card hover:bg-accent/50'
          : 'bg-muted/30 opacity-60'
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg shrink-0 overflow-hidden',
            model.isEnabled ? 'bg-primary/10' : 'bg-muted'
          )}
        >
          {hasValidImage && model.iconImageUrl ? (
            <Image
              src={model.iconImageUrl}
              alt=""
              width={40}
              height={40}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : IconComponent ? (
            <IconComponent
              className={cn('h-5 w-5', model.isEnabled ? iconColor : 'text-muted-foreground')}
            />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{model.displayName}</h4>
            {!model.isEnabled && (
              <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                無効
              </span>
            )}
          </div>
          {model.description && (
            <p className="text-sm text-muted-foreground truncate">
              {model.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
            {model.name} / {model.baseModel}
          </p>
          {model.systemPrompt && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {model.systemPrompt.slice(0, 100)}
              {model.systemPrompt.length > 100 && '...'}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4 shrink-0">
        <Switch
          checked={model.isEnabled}
          onCheckedChange={onToggleEnabled}
          disabled={disabled}
          aria-label={model.isEnabled ? '無効にする' : '有効にする'}
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
