'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { GitBranch, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GitCloneResult } from '@/types';

interface GitCloneFormProps {
  onCloneSuccess: (path: string, displayPath: string) => void;
}

export function GitCloneForm({ onCloneSuccess }: GitCloneFormProps) {
  const t = useTranslations('gitClone');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [targetFolderName, setTargetFolderName] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClone = useCallback(async () => {
    if (!repositoryUrl.trim()) {
      setError(t('errors.urlRequired'));
      return;
    }

    setIsCloning(true);
    setError(null);

    try {
      const response = await fetch('/api/workspace/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryUrl: repositoryUrl.trim(),
          targetFolderName: targetFolderName.trim() || undefined,
        }),
      });

      const result: GitCloneResult = await response.json();

      if (result.success) {
        // Clone succeeded - call the success callback
        onCloneSuccess(result.relativePath, result.displayPath);
      } else {
        // Clone failed - show error
        let errorMessage = result.error;
        switch (result.errorCode) {
          case 'INVALID_URL':
            errorMessage = t('errors.invalidUrl');
            break;
          case 'REPOSITORY_NOT_FOUND':
            errorMessage = t('errors.notFound');
            break;
          case 'AUTHENTICATION_FAILED':
            errorMessage = t('errors.authFailed');
            break;
          case 'FOLDER_EXISTS':
            errorMessage = t('errors.folderExists', { name: targetFolderName || 'repo' });
            break;
          case 'TIMEOUT':
            errorMessage = t('errors.timeout');
            break;
          case 'PATH_OUTSIDE_WORKSPACE':
            errorMessage = t('errors.pathTraversal');
            break;
        }
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Clone error:', err);
      setError(t('errors.generic'));
    } finally {
      setIsCloning(false);
    }
  }, [repositoryUrl, targetFolderName, onCloneSuccess, t]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <GitBranch className="h-4 w-4" />
        <span>{t('title')}</span>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="repository-url">{t('repoUrl')}</Label>
          <Input
            id="repository-url"
            type="text"
            placeholder="https://github.com/user/repo.git"
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            disabled={isCloning}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-folder">
            {t('targetFolder')}
            <span className="text-muted-foreground text-xs ml-1">({t('optional')})</span>
          </Label>
          <Input
            id="target-folder"
            type="text"
            placeholder={t('targetFolderPlaceholder')}
            value={targetFolderName}
            onChange={(e) => setTargetFolderName(e.target.value)}
            disabled={isCloning}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          onClick={handleClone}
          disabled={isCloning || !repositoryUrl.trim()}
          className="w-full"
        >
          {isCloning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('cloning')}
            </>
          ) : (
            t('clone')
          )}
        </Button>
      </div>

      {isCloning && (
        <p className="text-xs text-muted-foreground text-center">
          {t('largeRepoHint')}
        </p>
      )}
    </div>
  );
}
