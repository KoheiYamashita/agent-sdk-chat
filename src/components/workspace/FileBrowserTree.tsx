'use client';

import { useState, useCallback, useEffect } from 'react';
import { Folder, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileBrowserItem } from './FileBrowserItem';
import type { DirectoryItem } from '@/types';

interface FileBrowserTreeProps {
  selectedItem: DirectoryItem | null;
  onSelect: (item: DirectoryItem | null) => void;
  onRefresh?: () => void;
  className?: string;
  refreshKey?: number;
  workspacePath?: string;
}

export function FileBrowserTree({
  selectedItem,
  onSelect,
  onRefresh,
  className,
  refreshKey = 0,
  workspacePath,
}: FileBrowserTreeProps) {
  const [rootItems, setRootItems] = useState<DirectoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [basePath, setBasePath] = useState<string>('./workspace');
  // 展開状態を一元管理（リフレッシュしても維持される）
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Load root directory
  const loadRootItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ includeFiles: 'true' });
      if (workspacePath) {
        params.set('workspacePath', workspacePath);
      }
      const response = await fetch(`/api/workspace/list?${params}`);
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
  }, [workspacePath]);

  // Load children of a directory
  const loadChildren = useCallback(async (path: string): Promise<DirectoryItem[]> => {
    const params = new URLSearchParams({
      path,
      includeFiles: 'true',
    });
    if (workspacePath) {
      params.set('workspacePath', workspacePath);
    }
    const response = await fetch(`/api/workspace/list?${params}`);
    if (!response.ok) {
      throw new Error('Failed to load directory');
    }
    const data = await response.json();
    return data.items;
  }, [workspacePath]);

  // 展開状態をトグル
  const toggleExpanded = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Rename item
  const handleRename = useCallback(async (item: DirectoryItem, newName: string) => {
    const response = await fetch('/api/workspace/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath: item.path, newName, workspacePath }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to rename');
    }
    // Refresh tree
    await loadRootItems();
    onRefresh?.();
  }, [loadRootItems, onRefresh, workspacePath]);

  // Delete item
  const handleDelete = useCallback(async (item: DirectoryItem) => {
    const response = await fetch('/api/workspace/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: item.path, workspacePath }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete');
    }
    // Clear selection if deleted item was selected
    if (selectedItem?.path === item.path) {
      onSelect(null);
    }
    // Refresh tree
    await loadRootItems();
    onRefresh?.();
  }, [selectedItem, onSelect, loadRootItems, onRefresh, workspacePath]);

  // Download file
  const handleDownload = useCallback((item: DirectoryItem) => {
    const params = new URLSearchParams({ path: item.path });
    if (workspacePath) params.set('workspacePath', workspacePath);
    const url = `/api/workspace/file/download?${params}`;
    window.open(url, '_blank');
  }, [workspacePath]);

  // Handle selecting root
  const handleSelectRoot = useCallback(() => {
    onSelect({
      name: basePath,
      path: '.',
      isDirectory: true,
      hasChildren: (rootItems?.length ?? 0) > 0,
    });
  }, [onSelect, basePath, rootItems]);

  // Handle selecting an item
  const handleSelectItem = useCallback((item: DirectoryItem) => {
    onSelect(item);
  }, [onSelect]);

  // Initial load and refresh
  useEffect(() => {
    loadRootItems();
  }, [loadRootItems, refreshKey]);

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
            selectedItem?.path === '.' && 'bg-primary/10 text-primary'
          )}
          onClick={handleSelectRoot}
        >
          <Folder className="h-4 w-4 text-yellow-500 shrink-0" />
          <span className="text-sm font-medium">{basePath}</span>
        </div>

        {/* Root children */}
        {rootItems?.map((item) => (
          <FileBrowserItem
            key={item.path}
            item={item}
            isSelected={selectedItem?.path === item.path}
            selectedPath={selectedItem?.path ?? null}
            depth={0}
            isExpanded={expandedPaths.has(item.path)}
            expandedPaths={expandedPaths}
            onToggleExpand={toggleExpanded}
            onSelect={handleSelectItem}
            onLoadChildren={loadChildren}
            onRename={handleRename}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        ))}

        {/* Empty state */}
        {rootItems?.length === 0 && (
          <div className="text-sm text-muted-foreground p-4 text-center">
            ファイルがありません
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
