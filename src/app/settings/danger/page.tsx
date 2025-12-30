'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, BarChart3 } from 'lucide-react';

export default function DangerSettingsPage() {
  const t = useTranslations('settings.danger');
  const tCommon = useTranslations('common');
  const tSettings = useTranslations('settings');
  const { settings, isLoading, error, isSaving, updateDangerSettings } = useSettings();
  const [showUsageDialog, setShowUsageDialog] = useState(false);

  const handleShowUsageChange = async (checked: boolean) => {
    if (checked) {
      // Show confirmation dialog when enabling
      setShowUsageDialog(true);
    } else {
      // Disable directly
      await updateDangerSettings({ showUsage: false });
    }
  };

  const handleConfirmShowUsage = async () => {
    await updateDangerSettings({ showUsage: true });
    setShowUsageDialog(false);
  };

  const handleCancelShowUsage = () => {
    setShowUsageDialog(false);
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{tSettings('loadError')} {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="border-b border-destructive/20 pb-4">
              <h3 className="text-sm font-medium mb-3">{t('showUsage.title')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('showUsage.description')}
              </p>
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="show-usage"
                    checked={settings?.danger?.showUsage ?? false}
                    onCheckedChange={(checked) => handleShowUsageChange(checked === true)}
                    disabled={isSaving}
                  />
                  <Label htmlFor="show-usage" className="flex items-center gap-2 cursor-pointer">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span>{t('showUsage.label')}</span>
                  </Label>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showUsageDialog} onOpenChange={setShowUsageDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('showUsage.dialogTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  {t('showUsage.dialogDescription')}
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t('showUsage.dialogPoint1')}</li>
                  <li>{t('showUsage.dialogPoint2')}</li>
                  <li>{t('showUsage.dialogPoint3')}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelShowUsage}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmShowUsage}>{t('showUsage.enable')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
