'use client';

import { useEffect, useRef } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMessageSearch } from '@/contexts/MessageSearchContext';
import { cn } from '@/lib/utils';

export function MessageSearch() {
  const {
    query,
    setQuery,
    isOpen,
    close,
    matches,
    currentMatchIndex,
    goToNext,
    goToPrev,
  } = useMessageSearch();

  const inputRef = useRef<HTMLInputElement>(null);

  // 開いたときに入力フィールドにフォーカス
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  // Enterキーで次のマッチに移動、Shift+Enterで前のマッチに移動
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        goToPrev();
      } else {
        goToNext();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-background border-b">
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        ref={inputRef}
        type="text"
        placeholder="メッセージを検索..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-8 flex-1"
      />
      {query && (
        <span className={cn(
          'text-sm shrink-0 tabular-nums',
          matches.length === 0 ? 'text-destructive' : 'text-muted-foreground'
        )}>
          {matches.length === 0 ? '0件' : `${currentMatchIndex + 1}/${matches.length}`}
        </span>
      )}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={goToPrev}
          disabled={matches.length === 0}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={goToNext}
          disabled={matches.length === 0}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={close}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
