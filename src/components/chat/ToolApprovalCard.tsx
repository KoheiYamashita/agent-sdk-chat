'use client';

import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { ToolApprovalRequest, ToolApprovalResponse } from '@/types';
import { AlertTriangle, Terminal } from 'lucide-react';

interface ToolApprovalCardProps {
  request: ToolApprovalRequest;
  onRespond: (response: ToolApprovalResponse) => void;
}

export function ToolApprovalCard({ request, onRespond }: ToolApprovalCardProps) {
  const handleDecision = useCallback(
    (decision: ToolApprovalResponse['decision']) => {
      onRespond({ requestId: request.requestId, decision });
    },
    [request.requestId, onRespond]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'a':
          handleDecision('allow');
          break;
        case 'y':
          handleDecision('always');
          break;
        case 'd':
        case 'escape':
          handleDecision('deny');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDecision]);

  return (
    <Card className="mx-4 my-2 border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {request.isDangerous ? (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          ) : (
            <Terminal className="h-5 w-5 text-blue-500" />
          )}
          ツール実行の確認
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        <div>
          <span className="text-sm font-medium text-muted-foreground">ツール名:</span>
          <div className="mt-1 rounded-md bg-muted px-3 py-2 font-mono text-sm">
            {request.toolName}
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-muted-foreground">入力:</span>
          <div className="mt-1 max-h-32 overflow-auto rounded-md bg-muted px-3 py-2">
            <ToolInputDisplay input={request.toolInput} />
          </div>
        </div>

        {request.description && (
          <p className="text-sm text-muted-foreground">{request.description}</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2 pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDecision('deny')}
          className="text-destructive hover:text-destructive"
        >
          拒否 [d]
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleDecision('allow')}>
            許可 [a]
          </Button>
          <Button size="sm" onClick={() => handleDecision('always')}>
            常に許可 [y]
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function ToolInputDisplay({ input }: { input: unknown }) {
  if (input === null || input === undefined) {
    return <span className="text-muted-foreground italic">なし</span>;
  }

  if (typeof input === 'string') {
    return <pre className="whitespace-pre-wrap break-all font-mono text-sm">{input}</pre>;
  }

  if (typeof input === 'object') {
    return (
      <pre className="whitespace-pre-wrap break-all font-mono text-sm">
        {JSON.stringify(input, null, 2)}
      </pre>
    );
  }

  return <span className="font-mono text-sm">{String(input)}</span>;
}
