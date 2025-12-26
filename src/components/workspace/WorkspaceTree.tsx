'use client';

import { useState, useCallback, useEffect } from 'react';
import { Folder, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorkspaceTreeItem } from './WorkspaceTreeItem';
import type { DirectoryItem } from '@/types';

interface WorkspaceTreeProps {
  selectedPath: string | null;
  onSelect: (path: string, basePath: string) => void;
  className?: string;
}

export function WorkspaceTree({
  selectedPath,
  onSelect,
  className,
}: WorkspaceTreeProps) {
  const [rootItems, setRootItems] = useState<DirectoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [basePath, setBasePath] = useState<string>('./workspace');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load root directory
  const loadRootItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/workspace/list');
      if (!response.ok) {
        throw new Error('Failed to load workspace');
      }
      const data = await response.json();
      setRootItems(data.items);
      setBasePath(data.basePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load children of a directory
  const loadChildren = useCallback(async (path: string): Promise<DirectoryItem[]> => {
    const response = await fetch(`/api/workspace/list?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      throw new Error('Failed to load directory');
    }
    const data = await response.json();
    return data.items;
  }, []);

  // Create a new folder
  const createFolder = useCallback(async (parentPath: string, name: string) => {
    const response = await fetch('/api/workspace/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentPath, name }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create folder');
    }
    return response.json();
  }, []);

  // Create folder at root
  const handleCreateRootFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;

    setIsSubmitting(true);
    try {
      await createFolder('.', newFolderName.trim());
      // Reload root items
      await loadRootItems();
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (err) {
      console.error('Failed to create folder:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [newFolderName, createFolder, loadRootItems]);

  // Initial load
  useEffect(() => {
    loadRootItems();
  }, [loadRootItems]);

  // Handle selecting root
  const handleSelectRoot = useCallback(() => {
    onSelect('.', basePath);
  }, [onSelect, basePath]);

  // Handle selecting a child item
  const handleSelectItem = useCallback((path: string) => {
    onSelect(path, basePath);
  }, [onSelect, basePath]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-sm text-destructive p-4', className)}>
        {error}
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="p-2">
        {/* Root item */}
        <div
          className={cn(
            'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
            'hover:bg-accent/50',
            selectedPath === '.' && 'bg-primary/10 text-primary'
          )}
          onClick={handleSelectRoot}
        >
          <Folder className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium">{basePath} (デフォルト)</span>
        </div>

        {/* Root children */}
        {rootItems?.map((item) => (
          <WorkspaceTreeItem
            key={item.path}
            item={item}
            isSelected={selectedPath === item.path}
            selectedPath={selectedPath}
            onSelect={handleSelectItem}
            onLoadChildren={loadChildren}
            onCreateFolder={createFolder}
            depth={0}
          />
        ))}

        {/* New folder at root */}
        {isCreatingFolder ? (
          <div className="flex items-center gap-2 py-1.5 px-2 mt-1">
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="フォルダ名"
              className="h-7 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateRootFolder();
                } else if (e.key === 'Escape') {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }
              }}
              disabled={isSubmitting}
            />
            <Button
              size="sm"
              className="h-7 px-2"
              onClick={handleCreateRootFolder}
              disabled={!newFolderName.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                '作成'
              )}
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 mt-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsCreatingFolder(true)}
          >
            <Plus className="h-4 w-4" />
            新しいフォルダを作成
          </Button>
        )}
      </div>
    </ScrollArea>
  );
}
