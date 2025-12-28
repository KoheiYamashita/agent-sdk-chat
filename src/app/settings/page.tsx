'use client';

import { useSettings } from '@/hooks/useSettings';
import { PermissionModeRadioGroup } from '@/components/settings/PermissionModeRadioGroup';
import { DefaultToolsCheckboxGroup } from '@/components/settings/DefaultToolsCheckboxGroup';
import { SandboxSettingsForm } from '@/components/settings/SandboxSettingsForm';
import { AppearanceSettingsForm } from '@/components/settings/AppearanceSettingsForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Brain } from 'lucide-react';
import type { PermissionMode, SandboxSettings, AppearanceSettings } from '@/types';

export default function SettingsPage() {
  const { settings, isLoading, error, isSaving, updateGeneralSettings, updateAppearanceSettings, saveSettings } = useSettings();

  const handlePermissionModeChange = async (mode: PermissionMode) => {
    await updateGeneralSettings({ defaultPermissionMode: mode });
  };

  const handleThinkingEnabledChange = async (enabled: boolean) => {
    await updateGeneralSettings({ defaultThinkingEnabled: enabled });
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
      <Card className="bg-card/80 hover:bg-card transition-colors duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
            一般設定
          </CardTitle>
          <CardDescription>
            アプリケーションの基本設定を変更します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">デフォルト権限モード</h3>
              <p className="text-sm text-muted-foreground mb-4">
                新しいチャットで使用するデフォルトの権限モードを設定します。
                チャット画面で個別に変更することもできます。
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
              <h3 className="text-sm font-medium mb-3">拡張思考（Thinking）</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Claude の拡張思考機能を有効にすると、より深い推論が可能になります。
                トークン使用量が増加する場合があります。
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
                    <span>デフォルトでThinkingを有効にする</span>
                  </Label>
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
            デフォルトで許可するツール
          </CardTitle>
          <CardDescription>
            チェックしたツールは新しいチャット開始時から自動的に許可されます。
            チェックしていないツールは毎回確認を求めます。
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
            サンドボックス設定
          </CardTitle>
          <CardDescription>
            Claude Codeの実行環境を制限し、安全性を高めます。
            サンドボックスモードでは、指定したワークスペース内でのみ動作します。
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
              settings={settings?.sandbox ?? { enabled: true, workspacePath: './workspace' }}
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
            外観設定
          </CardTitle>
          <CardDescription>
            チャット画面に表示されるユーザーとClaudeのアイコンをカスタマイズします。
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
              settings={settings?.appearance ?? { userIcon: 'user', userInitials: '', userImageUrl: '', userName: '', botIcon: 'bot', botInitials: '', botImageUrl: '' }}
              onChange={handleAppearanceSettingsChange}
              disabled={isSaving}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
