'use client';

import { useState } from 'react';
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
            <p className="text-destructive">設定の読み込みに失敗しました: {error}</p>
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
            Danger Zone
          </CardTitle>
          <CardDescription>
            これらの設定は上級者向けです。変更前に内容をよくご確認ください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="border-b border-destructive/20 pb-4">
              <h3 className="text-sm font-medium mb-3">使用量表示</h3>
              <p className="text-sm text-muted-foreground mb-4">
                サイドバーに使用量表示へのリンクを追加します。
                ローカルのClaude Code認証情報を使用してサブスクリプションの利用状況を確認できます。
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
                    <span>使用量表示を有効化</span>
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
              注意
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  この設定を有効にすると、ローカルのClaude Code認証情報を
                  使用してサブスクリプションの利用量を表示します。
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>この機能は個人利用のみを想定しています</li>
                  <li>サードパーティへのサブスク認証提供はAnthropicの利用規約に抵触する可能性があります</li>
                  <li>自己責任でご利用ください</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelShowUsage}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmShowUsage}>理解して有効化</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
