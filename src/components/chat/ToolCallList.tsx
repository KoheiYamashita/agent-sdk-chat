'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, Loader2, Check, X, Terminal, FileText, Search, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolCall } from '@/types';

interface ToolCallListProps {
  toolCalls: ToolCall[];
}

export function ToolCallList({ toolCalls }: ToolCallListProps) {
  return (
    <div className="space-y-2 mt-3">
      {toolCalls.map((toolCall) => (
        <ToolCallItem key={toolCall.id} toolCall={toolCall} />
      ))}
    </div>
  );
}

function getToolIcon(name: string) {
  switch (name) {
    case 'Bash':
      return <Terminal className="h-3.5 w-3.5" />;
    case 'Read':
    case 'Write':
    case 'Edit':
      return <FileText className="h-3.5 w-3.5" />;
    case 'Glob':
    case 'Grep':
      return <Search className="h-3.5 w-3.5" />;
    case 'WebFetch':
    case 'WebSearch':
      return <Globe className="h-3.5 w-3.5" />;
    default:
      return <Terminal className="h-3.5 w-3.5" />;
  }
}

function ToolCallItem({ toolCall }: { toolCall: ToolCall }) {
  const t = useTranslations('toolCall');
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    pending: {
      icon: null,
      bg: 'bg-muted/50 border-border/50',
      badge: 'bg-muted text-muted-foreground'
    },
    running: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />,
      bg: 'bg-blue-500/5 border-blue-500/20',
      badge: 'bg-blue-500/10 text-blue-500'
    },
    completed: {
      icon: <Check className="h-3.5 w-3.5 text-green-500" />,
      bg: 'bg-green-500/5 border-green-500/20',
      badge: 'bg-green-500/10 text-green-500'
    },
    failed: {
      icon: <X className="h-3.5 w-3.5 text-red-500" />,
      bg: 'bg-red-500/5 border-red-500/20',
      badge: 'bg-red-500/10 text-red-500'
    },
  }[toolCall.status];

  return (
    <div className={cn('rounded-lg border transition-colors', statusConfig.bg)}>
      <button
        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-sm hover:bg-muted/30 transition-colors rounded-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium', statusConfig.badge)}>
          {getToolIcon(toolCall.name)}
          {toolCall.name}
        </span>
        <span className="flex-1 truncate text-muted-foreground text-xs font-mono">
          {getToolCallSummary(toolCall)}
        </span>
        {statusConfig.icon}
      </button>
      {isExpanded && (
        <div className="border-t border-border/30 px-3 py-3 space-y-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
              {t('inputParams')}
            </div>
            <pre className="text-xs bg-muted/30 p-3 rounded-md overflow-x-auto font-mono text-foreground/80">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.output !== undefined && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                {t('outputResult')}
              </div>
              <pre className="text-xs bg-muted/30 p-3 rounded-md overflow-x-auto max-h-48 font-mono text-foreground/80">
                {typeof toolCall.output === 'string'
                  ? toolCall.output
                  : JSON.stringify(toolCall.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getToolCallSummary(toolCall: ToolCall): string {
  const input = toolCall.input as Record<string, unknown>;

  switch (toolCall.name) {
    case 'Read':
      return String(input.file_path || '');
    case 'Write':
    case 'Edit':
      return String(input.file_path || '');
    case 'Bash':
      return String(input.command || '').slice(0, 50);
    case 'Glob':
      return String(input.pattern || '');
    case 'Grep':
      return String(input.pattern || '');
    case 'WebFetch':
      return String(input.url || '');
    case 'WebSearch':
      return String(input.query || '');
    default:
      return '';
  }
}
