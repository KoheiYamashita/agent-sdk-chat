'use client';

import { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DirectoryItem } from '@/types';

interface FileBrowserItemProps {
  item: DirectoryItem;
  isSelected: boolean;
  selectedPath: string | null;
  depth: number;
  onSelect: (item: DirectoryItem) => void;
  onLoadChildren: (path: string) => Promise<DirectoryItem[]>;
  onRename: (item: DirectoryItem, newName: string) => Promise<void>;
  onDelete: (item: DirectoryItem) => Promise<void>;
  onDownload: (item: DirectoryItem) => void;
}

// Get file icon based on extension
function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    ts: 'text-blue-500',
    tsx: 'text-blue-500',
    js: 'text-yellow-500',
    jsx: 'text-yellow-500',
    json: 'text-yellow-600',
    md: 'text-gray-500',
    css: 'text-pink-500',
    scss: 'text-pink-600',
    html: 'text-orange-500',
    py: 'text-green-500',
    go: 'text-cyan-500',
    rs: 'text-orange-600',
    java: 'text-red-500',
    yml: 'text-purple-500',
    yaml: 'text-purple-500',
  };
  return iconMap[ext] || 'text-muted-foreground';
}

export function FileBrowserItem({
  item,
  isSelected,
  selectedPath,
  depth,
  onSelect,
  onLoadChildren,
  onRename,
  onDelete,
  onDownload,
}: FileBrowserItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<DirectoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(item.name);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.isDirectory) return;

    if (!isExpanded && children === null) {
      setIsLoading(true);
      try {
        const loadedChildren = await onLoadChildren(item.path);
        setChildren(loadedChildren);
        setIsExpanded(true);
      } catch {
        console.error('Failed to load children');
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsExpanded(!isExpanded);
    }
  }, [item, isExpanded, children, onLoadChildren]);

  const handleClick = useCallback(() => {
    onSelect(item);
    if (item.isDirectory && !isExpanded && children === null) {
      handleToggle({ stopPropagation: () => {} } as React.MouseEvent);
    }
  }, [item, onSelect, isExpanded, children, handleToggle]);

  const handleRenameSubmit = useCallback(async () => {
    if (!newName.trim() || newName === item.name) {
      setIsRenaming(false);
      setNewName(item.name);
      return;
    }

    setIsSubmitting(true);
    try {
      await onRename(item, newName.trim());
      setIsRenaming(false);
    } catch {
      setNewName(item.name);
    } finally {
      setIsSubmitting(false);
    }
  }, [item, newName, onRename]);

  const handleDeleteClick = useCallback(async () => {
    await onDelete(item);
  }, [item, onDelete]);

  const handleDownloadClick = useCallback(() => {
    onDownload(item);
  }, [item, onDownload]);

  const paddingLeft = 8 + depth * 16;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-1 rounded-md cursor-pointer transition-colors group',
          'hover:bg-accent/50',
          isSelected && 'bg-primary/10 text-primary'
        )}
        style={{ paddingLeft }}
        onClick={handleClick}
      >
        {/* Expand/collapse button for directories */}
        {item.isDirectory ? (
          <button
            className="p-0.5 rounded hover:bg-accent/50"
            onClick={handleToggle}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Icon */}
        {item.isDirectory ? (
          <Folder className="h-4 w-4 text-yellow-500 shrink-0" />
        ) : (
          <File className={cn('h-4 w-4 shrink-0', getFileIcon(item.name))} />
        )}

        {/* Name */}
        {isRenaming ? (
          <Input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-6 text-sm flex-1 mr-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRenameSubmit();
              } else if (e.key === 'Escape') {
                setIsRenaming(false);
                setNewName(item.name);
              }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={isSubmitting}
          />
        ) : (
          <span className="text-sm truncate flex-1">{item.name}</span>
        )}

        {/* Actions dropdown */}
        {!isRenaming && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setIsRenaming(true);
                setNewName(item.name);
              }}>
                <Pencil className="h-4 w-4 mr-2" />
                名前を変更
              </DropdownMenuItem>
              {!item.isDirectory && (
                <DropdownMenuItem onClick={handleDownloadClick}>
                  <Download className="h-4 w-4 mr-2" />
                  ダウンロード
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={handleDeleteClick}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Children */}
      {isExpanded && children && (
        <div>
          {children.map((child) => (
            <FileBrowserItem
              key={child.path}
              item={child}
              isSelected={selectedPath === child.path}
              selectedPath={selectedPath}
              depth={depth + 1}
              onSelect={onSelect}
              onLoadChildren={onLoadChildren}
              onRename={onRename}
              onDelete={onDelete}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
}
