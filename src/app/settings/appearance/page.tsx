'use client';

import Link from 'next/link';
import { useSettings } from '@/hooks/useSettings';
import { AppearanceSettingsForm } from '@/components/settings/AppearanceSettingsForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Palette } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AppearanceSettings } from '@/types';

export default function AppearanceSettingsPage() {
  const t = useTranslations('settings');
  const { settings, isLoading, error, isSaving, updateAppearanceSettings } = useSettings();

  const handleAppearanceSettingsChange = async (appearance: AppearanceSettings) => {
    await updateAppearanceSettings(appearance);
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
            <Palette className="h-5 w-5" />
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
    </div>
  );
}
