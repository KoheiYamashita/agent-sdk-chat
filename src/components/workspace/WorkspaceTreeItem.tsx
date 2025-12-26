'use client';

import { useState, useCallback } from 'react';
import { ChevronRight, Folder, FolderOpen, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DirectoryItem } from '@/types';

interface WorkspaceTreeItemProps {
  item: DirectoryItem;
  isSelected: boolean;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onLoadChildren: (path: string) => Promise<DirectoryItem[]>;
  onCreateFolder: (parentPath: string, name: string) => Promise<void>;
  depth?: number;
}

export function WorkspaceTreeItem({
  item,
  isSelected,
  selectedPath,
  onSelect,
  onLoadChildren,
  onCreateFolder,
  depth = 0,
}: WorkspaceTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [children, setChildren] = useState<DirectoryItem[] | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = useCallback(async () => {
    if (!item.hasChildren) return;

    if (!isExpanded && children === null) {
      setIsLoading(true);
      try {
        const loadedChildren = await onLoadChildren(item.path);
        setChildren(loadedChildren);
      } catch (error) {
        console.error('Failed to load children:', error);
      } finally {
        setIsLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  }, [isExpanded, children, item.path, item.hasChildren, onLoadChildren]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateFolder(item.path, newFolderName.trim());
      // Reload children
      const loadedChildren = await onLoadChildren(item.path);
      setChildren(loadedChildren);
      setNewFolderName('');
      setIsCreatingFolder(false);
      // Auto-expand if not already
      if (!isExpanded) {
        setIsExpanded(true);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [newFolderName, item.path, onCreateFolder, onLoadChildren, isExpanded]);

  const isChildSelected = selectedPath?.startsWith(item.path + '/') || false;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
          'hover:bg-accent/50',
          isSelected && 'bg-primary/10 text-primary',
          isChildSelected && !isSelected && 'bg-accent/30'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className={cn(
            'p-0.5 rounded hover:bg-accent/50 transition-colors',
            !item.hasChildren && 'invisible'
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <ChevronRight
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          )}
        </button>

        {/* Folder icon and name */}
        <div
          className="flex items-center gap-2 flex-1 min-w-0"
          onClick={() => onSelect(item.path)}
        >
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="truncate text-sm">{item.name}</span>
        </div>

        {/* Add folder button (only when expanded) */}
        {isExpanded && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsCreatingFolder(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Children */}
      {isExpanded && children && (
        <div>
          {children.map((child) => (
            <WorkspaceTreeItem
              key={child.path}
              item={child}
              isSelected={selectedPath === child.path}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onLoadChildren={onLoadChildren}
              onCreateFolder={onCreateFolder}
              depth={depth + 1}
            />
          ))}

          {/* New folder input */}
          {isCreatingFolder && (
            <div
              className="flex items-center gap-2 py-1.5 px-2"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
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
                    handleCreateFolder();
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
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  '作成'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
