'use client';

import Link from 'next/link';
import { useSettings } from '@/hooks/useSettings';
import { SandboxSettingsForm } from '@/components/settings/SandboxSettingsForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FolderCog } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SandboxSettings } from '@/types';

export default function WorkspaceSettingsPage() {
  const t = useTranslations('settings');
  const { settings, isLoading, error, isSaving, saveSettings } = useSettings();

  const handleSandboxSettingsChange = async (sandbox: SandboxSettings) => {
    await saveSettings({ sandbox });
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
            <FolderCog className="h-5 w-5" />
            {t('workspace.title')}
          </CardTitle>
          <CardDescription>
            {t('workspace.description')}
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
    </div>
  );
}
