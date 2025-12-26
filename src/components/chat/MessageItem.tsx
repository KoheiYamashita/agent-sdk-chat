'use client';

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
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ToolCallList } from './ToolCallList';
import type { Message, AppearanceSettings, AvatarIconType, BotIconType } from '@/types';

interface MessageItemProps {
  message: Message;
  appearanceSettings?: AppearanceSettings;
}

function getUserIconComponent(type: AvatarIconType) {
  switch (type) {
    case 'user': return User;
    case 'user-circle': return UserCircle;
    case 'user-round': return UserRound;
    case 'circle-user': return CircleUser;
    case 'smile': return Smile;
    case 'star': return Star;
    case 'heart': return Heart;
    default: return User;
  }
}

function getBotIconComponent(type: BotIconType) {
  switch (type) {
    case 'bot': return Bot;
    case 'brain': return Brain;
    case 'sparkles': return Sparkles;
    case 'cpu': return Cpu;
    case 'zap': return Zap;
    case 'wand': return Wand;
    case 'message-circle': return MessageCircle;
    default: return Bot;
  }
}

// セキュリティ: 画像URLの検証（data: URLまたは有効なhttps URLのみ許可）
function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function MessageItem({ message, appearanceSettings }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isToolApproval = message.role === 'tool_approval';

  if (isToolApproval && message.toolApproval) {
    return <ToolApprovalMessage message={message} />;
  }

  const userIcon = appearanceSettings?.userIcon ?? 'user';
  const botIcon = appearanceSettings?.botIcon ?? 'bot';
  const userInitials = appearanceSettings?.userInitials ?? '';
  const botInitials = appearanceSettings?.botInitials ?? '';
  const userImageUrl = appearanceSettings?.userImageUrl ?? '';
  const botImageUrl = appearanceSettings?.botImageUrl ?? '';

  const UserIcon = getUserIconComponent(userIcon);
  const BotIcon = getBotIconComponent(botIcon);

  const renderUserAvatar = () => {
    if (userIcon === 'initials' && userInitials) {
      return <span className="text-xs font-medium">{userInitials}</span>;
    }
    return <UserIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  };

  const renderBotAvatar = () => {
    if (botIcon === 'initials' && botInitials) {
      return <span className="text-xs font-medium">{botInitials}</span>;
    }
    return <BotIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
  };

  // セキュリティ: 画像URLの検証を通過した場合のみ表示
  const showUserImage = userIcon === 'image' && isValidImageUrl(userImageUrl);
  const showBotImage = botIcon === 'image' && isValidImageUrl(botImageUrl);

  return (
    <div
      className={cn(
        'flex gap-3 sm:gap-4 px-3 sm:px-6 py-4 sm:py-5 transition-colors',
        isUser ? 'bg-muted/30' : 'bg-transparent'
      )}
    >
      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 ring-2 ring-background shadow-sm">
        {isUser && showUserImage && <AvatarImage src={userImageUrl} alt="User" />}
        {!isUser && showBotImage && <AvatarImage src={botImageUrl} alt="Claude" />}
        <AvatarFallback className={cn(
          isUser
            ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
            : 'bg-gradient-to-br from-secondary to-secondary/80'
        )}>
          {isUser ? renderUserAvatar() : renderBotAvatar()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-3 overflow-hidden min-w-0 pt-0.5">
        <MarkdownRenderer content={message.content} />
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallList toolCalls={message.toolCalls} />
        )}
      </div>
    </div>
  );
}

function ToolApprovalMessage({ message }: { message: Message }) {
  const approval = message.toolApproval!;
  const decision = approval.decision;

  const getDecisionInfo = () => {
    switch (decision) {
      case 'allow':
        return { icon: ShieldCheck, text: '許可', color: 'text-green-600', bg: 'bg-green-500/10' };
      case 'always':
        return { icon: ShieldCheck, text: '常に許可', color: 'text-blue-600', bg: 'bg-blue-500/10' };
      case 'deny':
        return { icon: ShieldX, text: '拒否', color: 'text-red-600', bg: 'bg-red-500/10' };
      default:
        return { icon: ShieldAlert, text: '待機中...', color: 'text-amber-600', bg: 'bg-amber-500/10' };
    }
  };

  const { icon: DecisionIcon, text: decisionText, color, bg } = getDecisionInfo();

  return (
    <div className={cn('flex gap-2 sm:gap-4 p-2 sm:p-4', bg)}>
      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
        <AvatarFallback className="bg-amber-500/20">
          <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2 overflow-hidden min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">ツール実行確認:</span>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {approval.toolName}
          </code>
          {approval.isDangerous && (
            <span className="text-xs text-amber-600">⚠️ 危険</span>
          )}
        </div>

        <div className="rounded-md bg-muted/50 p-2">
          <pre className="whitespace-pre-wrap break-all font-mono text-xs">
            {typeof approval.toolInput === 'string'
              ? approval.toolInput
              : JSON.stringify(approval.toolInput, null, 2)}
          </pre>
        </div>

        <div className={cn('flex items-center gap-1.5 text-sm font-medium', color)}>
          <DecisionIcon className="h-4 w-4" />
          {decisionText}
        </div>
      </div>
    </div>
  );
}
