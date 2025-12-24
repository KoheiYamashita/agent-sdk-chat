'use client';

import { User, Bot, Shield, ShieldCheck, ShieldX, ShieldAlert } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ToolCallList } from './ToolCallList';
import type { Message } from '@/types';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isToolApproval = message.role === 'tool_approval';

  if (isToolApproval && message.toolApproval) {
    return <ToolApprovalMessage message={message} />;
  }

  return (
    <div
      className={cn(
        'flex gap-2 sm:gap-4 p-2 sm:p-4',
        isUser ? 'bg-muted/50' : 'bg-background'
      )}
    >
      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
        <AvatarFallback className={cn(isUser ? 'bg-primary' : 'bg-secondary')}>
          {isUser ? <User className="h-3 w-3 sm:h-4 sm:w-4" /> : <Bot className="h-3 w-3 sm:h-4 sm:w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2 overflow-hidden min-w-0">
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
