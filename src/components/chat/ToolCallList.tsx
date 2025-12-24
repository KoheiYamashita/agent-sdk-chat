'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ToolCall } from '@/types';

interface ToolCallListProps {
  toolCalls: ToolCall[];
}

export function ToolCallList({ toolCalls }: ToolCallListProps) {
  return (
    <div className="space-y-2">
      {toolCalls.map((toolCall) => (
        <ToolCallItem key={toolCall.id} toolCall={toolCall} />
      ))}
    </div>
  );
}

function ToolCallItem({ toolCall }: { toolCall: ToolCall }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusIcon = {
    pending: null,
    running: <Loader2 className="h-3 w-3 animate-spin" />,
    completed: <Check className="h-3 w-3 text-green-500" />,
    failed: <X className="h-3 w-3 text-red-500" />,
  }[toolCall.status];

  const statusColor = {
    pending: 'bg-muted',
    running: 'bg-blue-100 dark:bg-blue-900',
    completed: 'bg-green-100 dark:bg-green-900',
    failed: 'bg-red-100 dark:bg-red-900',
  }[toolCall.status];

  return (
    <div className={cn('rounded-lg border', statusColor)}>
      <button
        className="flex items-center gap-2 w-full p-2 text-left text-sm"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <Badge variant="outline" className="font-mono text-xs">
          {toolCall.name}
        </Badge>
        <span className="flex-1 truncate text-muted-foreground">
          {getToolCallSummary(toolCall)}
        </span>
        {statusIcon}
      </button>
      {isExpanded && (
        <div className="border-t p-2 space-y-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              入力
            </div>
            <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.output !== undefined && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                出力
              </div>
              <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto max-h-40">
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
