'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Copy,
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
  isExpanded: boolean;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
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
  isExpanded,
  expandedPaths,
  onToggleExpand,
  onSelect,
  onLoadChildren,
  onRename,
  onDelete,
  onDownload,
}: FileBrowserItemProps) {
  // 子要素のキャッシュはローカルで維持（パフォーマンスのため）
  const [children, setChildren] = useState<DirectoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(item.name);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 展開状態だが子要素がない場合（リフレッシュ後など）に自動で再読み込み
  useEffect(() => {
    if (isExpanded && children === null && item.isDirectory && !isLoading) {
      const loadChildren = async () => {
        setIsLoading(true);
        try {
          const loadedChildren = await onLoadChildren(item.path);
          setChildren(loadedChildren);
        } catch {
          console.error('Failed to load children');
        } finally {
          setIsLoading(false);
        }
      };
      loadChildren();
    }
  }, [isExpanded, children, item.isDirectory, item.path, isLoading, onLoadChildren]);

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.isDirectory) return;

    if (!isExpanded && children === null) {
      // 初回展開：子要素を読み込む
      setIsLoading(true);
      try {
        const loadedChildren = await onLoadChildren(item.path);
        setChildren(loadedChildren);
        onToggleExpand(item.path);
      } catch {
        console.error('Failed to load children');
      } finally {
        setIsLoading(false);
      }
    } else {
      // 2回目以降：展開状態をトグル
      onToggleExpand(item.path);
    }
  }, [item, isExpanded, children, onLoadChildren, onToggleExpand]);

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

  const handleCopyPath = useCallback(async () => {
    // セキュアコンテキスト（HTTPS/localhost）ではClipboard APIを使用
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(item.path);
        return;
      } catch {
        // フォールバックへ
      }
    }

    // 非セキュアコンテキスト（HTTP）ではプロンプトで表示
    window.prompt('パスをコピーしてください:', item.path);
  }, [item.path]);

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
              <DropdownMenuItem onClick={handleCopyPath}>
                <Copy className="h-4 w-4 mr-2" />
                パスをコピー
              </DropdownMenuItem>
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
              isExpanded={expandedPaths.has(child.path)}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
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
