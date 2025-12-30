'use client';

import Link from 'next/link';
import { useSettings } from '@/hooks/useSettings';
import { useAllModels } from '@/hooks/useModels';
import { PermissionModeRadioGroup } from '@/components/settings/PermissionModeRadioGroup';
import { TitleGenerationSettingsForm } from '@/components/settings/TitleGenerationSettingsForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Clock, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PermissionMode, TitleGenerationSettings } from '@/types';

export default function ChatSettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const { settings, isLoading, error, isSaving, updateGeneralSettings, updateTitleGenerationSettings } = useSettings();
  const { standardModels, isLoading: isLoadingModels } = useAllModels();

  const handlePermissionModeChange = async (mode: PermissionMode) => {
    await updateGeneralSettings({ defaultPermissionMode: mode });
  };

  const handleApprovalTimeoutChange = async (minutes: number) => {
    await updateGeneralSettings({ approvalTimeoutMinutes: minutes });
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
            <MessageSquare className="h-5 w-5" />
            {t('chat.title')}
          </CardTitle>
          <CardDescription>
            {t('chat.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
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
    </div>
  );
}
