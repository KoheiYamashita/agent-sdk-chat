'use client';

import { useState, useCallback, useRef } from 'react';
import {
  User,
  UserCircle,
  UserRound,
  Smile,
  Star,
  Heart,
  CircleUser,
  Bot,
  Brain,
  Sparkles,
  Cpu,
  Zap,
  Wand,
  MessageCircle,
  ImagePlus,
  X,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { optimizeImage, isValidImageUrl } from '@/lib/image-utils';
import type { AppearanceSettings, AvatarIconType, BotIconType } from '@/types';

interface AppearanceSettingsFormProps {
  settings: AppearanceSettings;
  onChange: (settings: AppearanceSettings) => void;
  disabled?: boolean;
}

const userIcons: { type: AvatarIconType; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { type: 'user', icon: User, label: 'ユーザー' },
  { type: 'user-circle', icon: UserCircle, label: '丸型' },
  { type: 'user-round', icon: UserRound, label: '丸' },
  { type: 'circle-user', icon: CircleUser, label: 'サークル' },
  { type: 'smile', icon: Smile, label: 'スマイル' },
  { type: 'star', icon: Star, label: 'スター' },
  { type: 'heart', icon: Heart, label: 'ハート' },
  { type: 'initials', icon: User, label: 'イニシャル' },
  { type: 'image', icon: ImagePlus, label: '画像' },
];

const botIcons: { type: BotIconType; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { type: 'bot', icon: Bot, label: 'ボット' },
  { type: 'brain', icon: Brain, label: '脳' },
  { type: 'sparkles', icon: Sparkles, label: 'キラキラ' },
  { type: 'cpu', icon: Cpu, label: 'CPU' },
  { type: 'zap', icon: Zap, label: '稲妻' },
  { type: 'wand', icon: Wand, label: '魔法' },
  { type: 'message-circle', icon: MessageCircle, label: 'メッセージ' },
  { type: 'initials', icon: Bot, label: 'イニシャル' },
  { type: 'image', icon: ImagePlus, label: '画像' },
];

export function getUserIcon(type: AvatarIconType) {
  const iconConfig = userIcons.find((i) => i.type === type);
  return iconConfig?.icon ?? User;
}

export function getBotIcon(type: BotIconType) {
  const iconConfig = botIcons.find((i) => i.type === type);
  return iconConfig?.icon ?? Bot;
}


// セキュリティ: イニシャルのサニタイズ（英数字のみ許可）
function sanitizeInitials(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
}

// セキュリティ: 名前のサニタイズ（スクリプトインジェクション防止）
function sanitizeName(input: string): string {
  return input.replace(/[<>'"&]/g, '').slice(0, 50);
}

export function AppearanceSettingsForm({
  settings,
  onChange,
  disabled,
}: AppearanceSettingsFormProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isUploadingUser, setIsUploadingUser] = useState(false);
  const [isUploadingBot, setIsUploadingBot] = useState(false);
  const userFileInputRef = useRef<HTMLInputElement>(null);
  const botFileInputRef = useRef<HTMLInputElement>(null);

  const handleUserIconChange = useCallback(
    (type: AvatarIconType) => {
      const newSettings = { ...localSettings, userIcon: type };
      setLocalSettings(newSettings);
      onChange(newSettings);
    },
    [localSettings, onChange]
  );

  const handleBotIconChange = useCallback(
    (type: BotIconType) => {
      const newSettings = { ...localSettings, botIcon: type };
      setLocalSettings(newSettings);
      onChange(newSettings);
    },
    [localSettings, onChange]
  );

  const handleUserInitialsChange = useCallback(
    (initials: string) => {
      const sanitized = sanitizeInitials(initials);
      const newSettings = { ...localSettings, userInitials: sanitized };
      setLocalSettings(newSettings);
      onChange(newSettings);
    },
    [localSettings, onChange]
  );

  const handleBotInitialsChange = useCallback(
    (initials: string) => {
      const sanitized = sanitizeInitials(initials);
      const newSettings = { ...localSettings, botInitials: sanitized };
      setLocalSettings(newSettings);
      onChange(newSettings);
    },
    [localSettings, onChange]
  );

  const handleUserNameChange = useCallback(
    (name: string) => {
      const sanitized = sanitizeName(name);
      const newSettings = { ...localSettings, userName: sanitized };
      setLocalSettings(newSettings);
      onChange(newSettings);
    },
    [localSettings, onChange]
  );

  const handleUserImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingUser(true);
      try {
        const imageUrl = await optimizeImage(file, 128, 0.85);
        const newSettings = { ...localSettings, userImageUrl: imageUrl };
        setLocalSettings(newSettings);
        onChange(newSettings);
      } catch (error) {
        console.error('Failed to optimize image:', error);
      } finally {
        setIsUploadingUser(false);
        if (userFileInputRef.current) {
          userFileInputRef.current.value = '';
        }
      }
    },
    [localSettings, onChange]
  );

  const handleBotImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingBot(true);
      try {
        const imageUrl = await optimizeImage(file, 128, 0.85);
        const newSettings = { ...localSettings, botImageUrl: imageUrl };
        setLocalSettings(newSettings);
        onChange(newSettings);
      } catch (error) {
        console.error('Failed to optimize image:', error);
      } finally {
        setIsUploadingBot(false);
        if (botFileInputRef.current) {
          botFileInputRef.current.value = '';
        }
      }
    },
    [localSettings, onChange]
  );

  const handleClearUserImage = useCallback(() => {
    const newSettings = { ...localSettings, userImageUrl: '' };
    setLocalSettings(newSettings);
    onChange(newSettings);
    if (userFileInputRef.current) {
      userFileInputRef.current.value = '';
    }
  }, [localSettings, onChange]);

  const handleClearBotImage = useCallback(() => {
    const newSettings = { ...localSettings, botImageUrl: '' };
    setLocalSettings(newSettings);
    onChange(newSettings);
    if (botFileInputRef.current) {
      botFileInputRef.current.value = '';
    }
  }, [localSettings, onChange]);

  const renderUserAvatarContent = () => {
    if (localSettings.userIcon === 'image' && localSettings.userImageUrl) {
      return null; // AvatarImage will handle it
    }
    if (localSettings.userIcon === 'initials' && localSettings.userInitials) {
      return localSettings.userInitials;
    }
    const Icon = getUserIcon(localSettings.userIcon);
    return <Icon className="h-4 w-4" />;
  };

  const renderBotAvatarContent = () => {
    if (localSettings.botIcon === 'image' && localSettings.botImageUrl) {
      return null; // AvatarImage will handle it
    }
    if (localSettings.botIcon === 'initials' && localSettings.botInitials) {
      return localSettings.botInitials;
    }
    const Icon = getBotIcon(localSettings.botIcon);
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* User Icon Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">ユーザーアイコン</Label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {userIcons.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              type="button"
              disabled={disabled}
              onClick={() => handleUserIconChange(type)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all',
                'hover:bg-accent/50 hover:border-foreground/20',
                localSettings.userIcon === type
                  ? 'bg-accent border-foreground/30 ring-1 ring-foreground/20'
                  : 'border-border/50 bg-background/50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              title={label}
            >
              <Avatar className="h-7 w-7 ring-2 ring-background shadow-sm">
                {type === 'image' && localSettings.userImageUrl ? (
                  <AvatarImage src={localSettings.userImageUrl} alt="User" />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs">
                  {type === 'initials' && localSettings.userInitials ? (
                    localSettings.userInitials
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                {label}
              </span>
            </button>
          ))}
        </div>
        {localSettings.userIcon === 'initials' && (
          <div className="mt-2">
            <Input
              placeholder="例: YT"
              value={localSettings.userInitials}
              onChange={(e) => handleUserInitialsChange(e.target.value)}
              maxLength={2}
              disabled={disabled}
              className="w-24"
            />
            <p className="text-xs text-muted-foreground mt-1">2文字まで入力できます</p>
          </div>
        )}
        {localSettings.userIcon === 'image' && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <input
                ref={userFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUserImageUpload}
                disabled={disabled || isUploadingUser}
                className="hidden"
                id="user-image-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => userFileInputRef.current?.click()}
                disabled={disabled || isUploadingUser}
              >
                {isUploadingUser ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4 mr-2" />
                    画像を選択
                  </>
                )}
              </Button>
              {localSettings.userImageUrl && !isUploadingUser && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearUserImage}
                  disabled={disabled}
                >
                  <X className="h-4 w-4 mr-1" />
                  削除
                </Button>
              )}
            </div>
            {localSettings.userImageUrl && (
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                  <AvatarImage src={localSettings.userImageUrl} alt="User preview" />
                </Avatar>
                <span className="text-xs text-muted-foreground">現在の画像</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">PNG, JPG, GIF, WebP形式に対応（128pxに最適化）</p>
          </div>
        )}
      </div>

      {/* User Name */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">表示名</Label>
        <Input
          placeholder="例: Taro"
          value={localSettings.userName ?? ''}
          onChange={(e) => handleUserNameChange(e.target.value)}
          maxLength={50}
          disabled={disabled}
          className="w-full max-w-xs"
        />
        <p className="text-xs text-muted-foreground">チャットで表示される名前（空白の場合は「あなた」と表示）</p>
      </div>

      {/* Bot Icon Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Claudeアイコン</Label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {botIcons.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              type="button"
              disabled={disabled}
              onClick={() => handleBotIconChange(type)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all',
                'hover:bg-accent/50 hover:border-foreground/20',
                localSettings.botIcon === type
                  ? 'bg-accent border-foreground/30 ring-1 ring-foreground/20'
                  : 'border-border/50 bg-background/50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              title={label}
            >
              <Avatar className="h-7 w-7 ring-2 ring-background shadow-sm">
                {type === 'image' && localSettings.botImageUrl ? (
                  <AvatarImage src={localSettings.botImageUrl} alt="Bot" />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-secondary to-secondary/80 text-xs">
                  {type === 'initials' && localSettings.botInitials ? (
                    localSettings.botInitials
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                {label}
              </span>
            </button>
          ))}
        </div>
        {localSettings.botIcon === 'initials' && (
          <div className="mt-2">
            <Input
              placeholder="例: AI"
              value={localSettings.botInitials}
              onChange={(e) => handleBotInitialsChange(e.target.value)}
              maxLength={2}
              disabled={disabled}
              className="w-24"
            />
            <p className="text-xs text-muted-foreground mt-1">2文字まで入力できます</p>
          </div>
        )}
        {localSettings.botIcon === 'image' && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <input
                ref={botFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBotImageUpload}
                disabled={disabled || isUploadingBot}
                className="hidden"
                id="bot-image-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => botFileInputRef.current?.click()}
                disabled={disabled || isUploadingBot}
              >
                {isUploadingBot ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4 mr-2" />
                    画像を選択
                  </>
                )}
              </Button>
              {localSettings.botImageUrl && !isUploadingBot && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearBotImage}
                  disabled={disabled}
                >
                  <X className="h-4 w-4 mr-1" />
                  削除
                </Button>
              )}
            </div>
            {localSettings.botImageUrl && (
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                  <AvatarImage src={localSettings.botImageUrl} alt="Bot preview" />
                </Avatar>
                <span className="text-xs text-muted-foreground">現在の画像</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">PNG, JPG, GIF, WebP形式に対応（128pxに最適化）</p>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">プレビュー</Label>
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
              {localSettings.userIcon === 'image' && localSettings.userImageUrl ? (
                <AvatarImage src={localSettings.userImageUrl} alt="User" />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs">
                {renderUserAvatarContent()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{localSettings.userName || 'あなた'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
              {localSettings.botIcon === 'image' && localSettings.botImageUrl ? (
                <AvatarImage src={localSettings.botImageUrl} alt="Bot" />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-secondary to-secondary/80 text-xs">
                {renderBotAvatarContent()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">Claude</span>
          </div>
        </div>
      </div>
    </div>
  );
}
