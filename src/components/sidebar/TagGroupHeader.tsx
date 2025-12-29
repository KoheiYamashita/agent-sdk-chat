'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface TagGroupHeaderProps {
  tagId: string | null;
  tagName: string;
  sessionCount: number;
  isOpen: boolean;
  onRename: (tagId: string) => void;
  onDelete: (tagId: string) => void;
  canDelete: boolean;
}

export function TagGroupHeader({
  tagId,
  tagName,
  sessionCount,
  isOpen,
  onRename,
  onDelete,
  canDelete,
}: TagGroupHeaderProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen(false);
    if (tagId) {
      onRename(tagId);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen(false);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (tagId) {
      onDelete(tagId);
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md group',
            'hover:bg-accent/50'
          )}
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="flex-1 text-sm font-medium truncate">{tagName}</span>
          <span className="text-xs text-muted-foreground shrink-0">{sessionCount}</span>

          {tagId && (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleRenameClick}>
                  <Pencil className="h-4 w-4 mr-2" />
                  名前変更
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CollapsibleTrigger>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {canDelete ? `タグ「${tagName}」を削除` : '削除できません'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {canDelete
                ? 'このタグを削除しますか？この操作は取り消せません。'
                : `タグ「${tagName}」には${sessionCount}件のセッションが紐づいています。先にセッションのタグを解除してください。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {canDelete ? (
              <>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  削除
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={() => setShowDeleteDialog(false)}>
                OK
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
