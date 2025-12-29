'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface TagRenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onSave: (newName: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function TagRenameDialog({
  open,
  onOpenChange,
  currentName,
  onSave,
  isLoading,
  error,
}: TagRenameDialogProps) {
  const [name, setName] = useState(currentName);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setName(currentName);
    }
  }, [open, currentName]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (trimmedName && trimmedName !== currentName) {
      await onSave(trimmedName);
    }
  };

  const canSave = name.trim() && name.trim() !== currentName && !isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>タグ名を変更</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">タグ名</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="タグ名を入力"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSave) {
                  handleSave();
                }
              }}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
