'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface WorkspaceBadgeProps {
  path: string | null;
  className?: string;
}

export function WorkspaceBadge({ path, className }: WorkspaceBadgeProps) {
  const t = useTranslations('workspaceBadge');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Display path (relative from workspace root)
  const displayPath = path === '.' || !path ? t('default') : path;

  // Truncate long paths for display
  const maxLength = 20;
  const isTruncated = displayPath.length > maxLength;
  const truncatedPath = isTruncated
    ? '...' + displayPath.slice(-(maxLength - 3))
    : displayPath;

  return (
    <TooltipProvider>
      <Tooltip>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md',
                  'text-xs text-muted-foreground',
                  'bg-muted/50 hover:bg-muted transition-colors',
                  'max-w-[150px] sm:max-w-[200px]',
                  className
                )}
              >
                <Folder className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{truncatedPath}</span>
              </button>
            </DialogTrigger>
          </TooltipTrigger>

          {isTruncated && (
            <TooltipContent side="bottom" align="end">
              <p className="font-mono text-xs">{displayPath}</p>
            </TooltipContent>
          )}

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5" />
                {t('workspace')}
              </DialogTitle>
              <DialogDescription>
                {t('currentDir')}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <div className="p-3 bg-muted rounded-md">
                <code className="text-sm break-all">{displayPath}</code>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {t('dirHint')}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </Tooltip>
    </TooltipProvider>
  );
}
