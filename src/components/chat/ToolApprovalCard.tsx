'use client';

import { useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { ToolApprovalRequest, ToolApprovalResponse } from '@/types';
import { AlertTriangle, Terminal } from 'lucide-react';

interface ToolApprovalCardProps {
  request: ToolApprovalRequest;
  onRespond: (response: ToolApprovalResponse) => void;
}

export function ToolApprovalCard({ request, onRespond }: ToolApprovalCardProps) {
  const t = useTranslations('toolApproval');
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
    <Card className="mx-2 sm:mx-4 my-2 border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          {request.isDangerous ? (
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" />
          ) : (
            <Terminal className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 shrink-0" />
          )}
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-3 px-3 sm:px-6">
        <div>
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">{t('toolName')}</span>
          <div className="mt-1 rounded-md bg-muted px-2 sm:px-3 py-1.5 sm:py-2 font-mono text-xs sm:text-sm break-all">
            {request.toolName}
          </div>
        </div>

        <div>
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">{t('input')}</span>
          <div className="mt-1 max-h-24 sm:max-h-32 overflow-auto rounded-md bg-muted px-2 sm:px-3 py-1.5 sm:py-2">
            <ToolInputDisplay input={request.toolInput} />
          </div>
        </div>

        {request.description && (
          <p className="text-xs sm:text-sm text-muted-foreground">{request.description}</p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-0 px-3 sm:px-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDecision('deny')}
          className="text-destructive hover:text-destructive w-full sm:w-auto order-2 sm:order-1"
        >
          <span className="sm:hidden">{t('deny')}</span>
          <span className="hidden sm:inline">{t('denyShortcut')}</span>
        </Button>
        <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
          <Button variant="outline" size="sm" onClick={() => handleDecision('allow')} className="flex-1 sm:flex-none">
            <span className="sm:hidden">{t('allow')}</span>
            <span className="hidden sm:inline">{t('allowShortcut')}</span>
          </Button>
          <Button size="sm" onClick={() => handleDecision('always')} className="flex-1 sm:flex-none">
            <span className="sm:hidden">{t('alwaysAllow')}</span>
            <span className="hidden sm:inline">{t('alwaysAllowShortcut')}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function ToolInputDisplay({ input }: { input: unknown }) {
  const t = useTranslations('toolApproval');
  if (input === null || input === undefined) {
    return <span className="text-muted-foreground italic text-xs sm:text-sm">{t('none')}</span>;
  }

  if (typeof input === 'string') {
    return <pre className="whitespace-pre-wrap break-all font-mono text-xs sm:text-sm">{input}</pre>;
  }

  if (typeof input === 'object') {
    return (
      <pre className="whitespace-pre-wrap break-all font-mono text-xs sm:text-sm">
        {JSON.stringify(input, null, 2)}
      </pre>
    );
  }

  return <span className="font-mono text-xs sm:text-sm">{String(input)}</span>;
}
