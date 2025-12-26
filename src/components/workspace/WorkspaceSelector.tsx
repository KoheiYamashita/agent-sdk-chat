'use client';

import { useState, useCallback } from 'react';
import { FolderOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkspaceTree } from './WorkspaceTree';

// Helper to get display path from basePath and relativePath
function getDisplayPath(basePath: string, relativePath: string): string {
  // Remove leading ./ from basePath
  const cleanBasePath = basePath.replace(/^\.\//, '');
  if (relativePath === '.') {
    return cleanBasePath;
  }
  return `${cleanBasePath}/${relativePath}`;
}

interface WorkspaceSelectorProps {
  selectedPath: string | null;
  onSelect: (path: string, displayPath: string) => void;
}

export function WorkspaceSelector({
  selectedPath,
  onSelect,
}: WorkspaceSelectorProps) {
  const [localSelectedPath, setLocalSelectedPath] = useState<string | null>(selectedPath);
  const [displayPath, setDisplayPath] = useState<string | null>(null);

  const handleSelect = useCallback((path: string, basePath: string) => {
    const display = getDisplayPath(basePath, path);
    setLocalSelectedPath(path);
    setDisplayPath(display);
    onSelect(path, display);
  }, [onSelect]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">新しいチャットを開始</h2>
        <p className="text-muted-foreground">
          作業スペースを選択してメッセージを入力してください
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            作業スペースを選択
          </CardTitle>
          <CardDescription>
            Claudeが操作するディレクトリを選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md h-[250px] overflow-hidden">
            <WorkspaceTree
              selectedPath={localSelectedPath}
              onSelect={handleSelect}
            />
          </div>
          {displayPath && (
            <p className="text-xs text-muted-foreground mt-2">
              選択中: <code className="bg-muted px-1 py-0.5 rounded">{displayPath}</code>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
