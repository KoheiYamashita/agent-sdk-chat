'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '@/hooks/useSettings';
import { useAllModels } from '@/hooks/useModels';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
import { isValidImageUrl } from '@/lib/image-utils';
import { ArrowLeft, Bot, Brain, Globe, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SelectableModel } from '@/types';

function ModelIcon({ model }: { model: SelectableModel }) {
  if (model.type === 'custom' && model.iconImageUrl && isValidImageUrl(model.iconImageUrl)) {
    return (
      <Image
        src={model.iconImageUrl}
        alt=""
        width={16}
        height={16}
        className="rounded object-cover"
        unoptimized
      />
    );
  }
  return <Bot className={model.type === 'custom' ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground'} />;
}

export default function GeneralSettingsPage() {
  const t = useTranslations('settings');
  const { settings, isLoading, error, isSaving, updateGeneralSettings } = useSettings();
  const { selectableModels, isLoading: isLoadingModels } = useAllModels();

  const handleLanguageChange = async (language: 'ja' | 'en' | 'zh') => {
    await updateGeneralSettings({ language });
  };

  const handleDefaultModelChange = async (modelId: string) => {
    await updateGeneralSettings({ defaultModel: modelId });
  };

  const handleThinkingEnabledChange = async (enabled: boolean) => {
    await updateGeneralSettings({ defaultThinkingEnabled: enabled });
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{t('loadError')} {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('backToSettings')}
          </Button>
        </Link>
      </div>

      <Card className="bg-card/80 hover:bg-card transition-colors duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('general.title')}
          </CardTitle>
          <CardDescription>
            {t('general.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                {t('language.title')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('language.description')}
              </p>
              {isLoading ? (
                <Skeleton className="h-10 w-full max-w-xs" />
              ) : (
                <Select
                  value={settings?.general.language ?? 'ja'}
                  onValueChange={(value) => handleLanguageChange(value as 'ja' | 'en' | 'zh')}
                  disabled={isSaving}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3">{t('general.defaultModel')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('general.defaultModelDescription')}
              </p>
              {isLoading || isLoadingModels ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={settings?.general.defaultModel ?? ''}
                  onValueChange={handleDefaultModelChange}
                  disabled={isSaving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('general.selectModel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>{t('general.standardModels')}</SelectLabel>
                      {selectableModels
                        .filter((m) => m.type === 'standard')
                        .map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              <ModelIcon model={model} />
                              <span>{model.displayName}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectGroup>
                    {selectableModels.some((m) => m.type === 'custom') && (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>{t('general.customModels')}</SelectLabel>
                          {selectableModels
                            .filter((m) => m.type === 'custom')
                            .map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                <div className="flex items-center gap-2">
                                  <ModelIcon model={model} />
                                  <span>{model.displayName}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3">{t('general.thinking')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('general.thinkingDescription')}
              </p>
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="thinking-enabled"
                    checked={settings?.general.defaultThinkingEnabled ?? false}
                    onCheckedChange={(checked) => handleThinkingEnabledChange(checked === true)}
                    disabled={isSaving}
                  />
                  <Label htmlFor="thinking-enabled" className="flex items-center gap-2 cursor-pointer">
                    <Brain className="h-4 w-4 text-purple-500" />
                    <span>{t('general.enableThinkingByDefault')}</span>
                  </Label>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
