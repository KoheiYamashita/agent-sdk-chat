'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '@/hooks/useSettings';
import { useAllModels } from '@/hooks/useModels';
import { PermissionModeRadioGroup } from '@/components/settings/PermissionModeRadioGroup';
import { DefaultToolsCheckboxGroup } from '@/components/settings/DefaultToolsCheckboxGroup';
import { SandboxSettingsForm } from '@/components/settings/SandboxSettingsForm';
import { AppearanceSettingsForm } from '@/components/settings/AppearanceSettingsForm';
import { TitleGenerationSettingsForm } from '@/components/settings/TitleGenerationSettingsForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Brain, Bot, ChevronRight, Clock, Wand2, AlertTriangle, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PermissionMode, SandboxSettings, AppearanceSettings, TitleGenerationSettings, SelectableModel } from '@/types';

// Render model icon (image or Bot icon)
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

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const { settings, isLoading, error, isSaving, updateGeneralSettings, updateAppearanceSettings, updateTitleGenerationSettings, saveSettings } = useSettings();
  const { selectableModels, standardModels, isLoading: isLoadingModels } = useAllModels();

  const handleLanguageChange = async (language: 'ja' | 'en' | 'zh') => {
    await updateGeneralSettings({ language });
  };

  const handleDefaultModelChange = async (modelId: string) => {
    await updateGeneralSettings({ defaultModel: modelId });
  };

  const handlePermissionModeChange = async (mode: PermissionMode) => {
    await updateGeneralSettings({ defaultPermissionMode: mode });
  };

  const handleThinkingEnabledChange = async (enabled: boolean) => {
    await updateGeneralSettings({ defaultThinkingEnabled: enabled });
  };

  const handleApprovalTimeoutChange = async (minutes: number) => {
    await updateGeneralSettings({ approvalTimeoutMinutes: minutes });
  };

  const handleDefaultToolsChange = async (allowedTools: string[]) => {
    if (!settings) return;
    await saveSettings({
      permissions: {
        ...settings.permissions,
        allowedTools,
      },
    });
  };

  const handleSandboxSettingsChange = async (sandbox: SandboxSettings) => {
    await saveSettings({ sandbox });
  };

  const handleAppearanceSettingsChange = async (appearance: AppearanceSettings) => {
    await updateAppearanceSettings(appearance);
  };

  const handleTitleGenerationSettingsChange = async (titleGeneration: TitleGenerationSettings) => {
    await updateTitleGenerationSettings(titleGeneration);
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
      <Card className="bg-card/80 hover:bg-card transition-colors duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
            {t('customModels.title')}
          </CardTitle>
          <CardDescription>
            {t('customModels.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full justify-between" asChild>
            <Link href="/settings/models">
              <div className="flex items-center gap-3">
                <Bot className="h-4 w-4 text-primary" />
                <span>{t('customModels.manage')}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card/80 hover:bg-card transition-colors duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
            {t('skills.title')}
          </CardTitle>
          <CardDescription>
            {t('skills.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full justify-between" asChild>
            <Link href="/settings/skills">
              <div className="flex items-center gap-3">
                <Wand2 className="h-4 w-4 text-primary" />
                <span>{t('skills.manage')}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card/80 hover:bg-card transition-colors duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
            {t('titleGeneration.title')}
          </CardTitle>
          <CardDescription>
            {t('titleGeneration.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || isLoadingModels ? (
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Skeleton className="h-4 w-4 mt-1" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <TitleGenerationSettingsForm
              settings={settings?.titleGeneration ?? { enabled: true, model: '', prompt: '' }}
              models={standardModels}
              onChange={handleTitleGenerationSettingsChange}
              disabled={isSaving}
            />
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/80 hover:bg-card transition-colors duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
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
              <h3 className="text-sm font-medium mb-3">{t('general.defaultPermissionMode')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('general.defaultPermissionModeDescription')}
              </p>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <Skeleton className="h-4 w-4 rounded-full mt-1" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PermissionModeRadioGroup
                  value={settings?.general.defaultPermissionMode ?? 'default'}
                  onChange={handlePermissionModeChange}
                  disabled={isSaving}
                />
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

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3">{t('general.approvalTimeout')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('general.approvalTimeoutDescription')}
              </p>
              {isLoading ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="approval-timeout"
                    type="number"
                    min={0}
                    max={1440}
                    value={settings?.general.approvalTimeoutMinutes ?? 60}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (!isNaN(value) && value >= 0 && value <= 1440) {
                        handleApprovalTimeoutChange(value);
                      }
                    }}
                    disabled={isSaving}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">{tCommon('minutes')}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/80 hover:bg-card transition-colors duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
            {t('permissions.title')}
          </CardTitle>
          <CardDescription>
            {t('permissions.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start space-x-3">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DefaultToolsCheckboxGroup
              selectedTools={settings?.permissions.allowedTools ?? []}
              onChange={handleDefaultToolsChange}
              disabled={isSaving}
            />
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/80 hover:bg-card transition-colors duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
            {t('sandbox.title')}
          </CardTitle>
          <CardDescription>
            {t('sandbox.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start space-x-3">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <SandboxSettingsForm
              settings={settings?.sandbox ?? { workspacePath: './workspace' }}
              onChange={handleSandboxSettingsChange}
              disabled={isSaving}
            />
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/80 hover:bg-card transition-colors duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
            {t('appearance.title')}
          </CardTitle>
          <CardDescription>
            {t('appearance.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-20 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AppearanceSettingsForm
              settings={settings?.appearance ?? { userIcon: 'user', userInitials: '', userImageUrl: '', userName: '', botIcon: 'bot', botInitials: '', botImageUrl: '', favicon: 'robot', customFaviconUrl: '' }}
              onChange={handleAppearanceSettingsChange}
              disabled={isSaving}
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/50 bg-destructive/5 hover:bg-destructive/10 transition-colors duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t('danger.title')}
          </CardTitle>
          <CardDescription>
            {t('danger.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full justify-between border-destructive/30 hover:border-destructive/50" asChild>
            <Link href="/settings/danger">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span>{t('danger.manage')}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
