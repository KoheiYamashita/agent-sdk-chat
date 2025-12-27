'use client';

import { useState, useCallback } from 'react';
import { FolderOpen, GitBranch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkspaceTree } from './WorkspaceTree';
import { GitCloneForm } from './GitCloneForm';

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

  const handleCloneSuccess = useCallback((path: string, display: string) => {
    setLocalSelectedPath(path);
    setDisplayPath(display);
    onSelect(path, display);
  }, [onSelect]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          新しいチャットを開始
        </h2>
        <p className="text-muted-foreground text-sm">
          作業スペースを選択してメッセージを入力してください
        </p>
      </div>

      <Card className="w-full max-w-md bg-card/80 hover:bg-card transition-colors duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-foreground/10">
              <FolderOpen className="h-4 w-4 text-foreground/80" />
            </div>
            作業スペースを選択
          </CardTitle>
          <CardDescription>
            Claudeが操作するディレクトリを選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="folder" className="w-full">
            <TabsList className="w-full mb-3">
              <TabsTrigger value="folder" className="flex-1 gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" />
                フォルダ選択
              </TabsTrigger>
              <TabsTrigger value="git" className="flex-1 gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                Git Clone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="folder">
              <div className="border border-border/50 rounded-lg h-[250px] overflow-hidden bg-background/50">
                <WorkspaceTree
                  selectedPath={localSelectedPath}
                  onSelect={handleSelect}
                />
              </div>
            </TabsContent>

            <TabsContent value="git">
              <div className="border border-border/50 rounded-lg min-h-[250px] bg-background/50">
                <GitCloneForm onCloneSuccess={handleCloneSuccess} />
              </div>
            </TabsContent>
          </Tabs>

          {displayPath && (
            <p className="text-xs text-muted-foreground mt-3">
              選択中: <code className="bg-foreground/10 text-foreground/80 px-1.5 py-0.5 rounded">{displayPath}</code>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
