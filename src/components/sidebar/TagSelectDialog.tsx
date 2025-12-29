'use client';

import { useState, useEffect } from 'react';
import { useTags } from '@/hooks/useTags';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Plus, X, Loader2 } from 'lucide-react';

interface TagSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTagId: string | null;
  onSelect: (tagId: string | null) => Promise<void>;
}

export function TagSelectDialog({
  open,
  onOpenChange,
  currentTagId,
  onSelect,
}: TagSelectDialogProps) {
  const { tags, createTag, isCreating } = useTags();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(currentTagId);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedTagId(currentTagId);
      setIsCreatingNew(false);
      setNewTagName('');
      setError(null);
      setIsSaving(false);
    }
  }, [open, currentTagId]);

  const handleSave = async () => {
    if (isCreatingNew && newTagName.trim()) {
      try {
        setError(null);
        const newTag = await createTag({ name: newTagName.trim() });
        await onSelect(newTag.id);
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'タグの作成に失敗しました');
      }
    } else {
      try {
        setError(null);
        setIsSaving(true);
        await onSelect(selectedTagId);
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'タグの設定に失敗しました');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleRadioChange = (value: string) => {
    setIsCreatingNew(false);
    setSelectedTagId(value === 'none' ? null : value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>タグを設定</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={isCreatingNew ? 'new' : (selectedTagId ?? 'none')}
            onValueChange={handleRadioChange}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="tag-none" />
              <Label htmlFor="tag-none" className="cursor-pointer">
                タグなし
              </Label>
            </div>
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center space-x-2">
                <RadioGroupItem value={tag.id} id={`tag-${tag.id}`} />
                <Label htmlFor={`tag-${tag.id}`} className="cursor-pointer flex-1">
                  {tag.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({tag.sessionCount})
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="pt-2 border-t">
            {isCreatingNew ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="新規タグ名"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTagName.trim()) {
                        handleSave();
                      } else if (e.key === 'Escape') {
                        setIsCreatingNew(false);
                        setNewTagName('');
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setNewTagName('');
                      setError(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsCreatingNew(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                新規タグを作成
              </Button>
            )}
          </div>
        </div>

        {/* Error display for existing tag selection */}
        {error && !isCreatingNew && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={isCreating || isSaving || (isCreatingNew && !newTagName.trim())}
          >
            {(isCreating || isSaving) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
