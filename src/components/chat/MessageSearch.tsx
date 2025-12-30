'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMessageSearch } from '@/contexts/MessageSearchContext';
import { cn } from '@/lib/utils';

export function MessageSearch() {
  const t = useTranslations('chat');
  const {
    query,
    setQuery,
    isOpen,
    close,
    currentMatchIndex,
    goToNext,
    goToPrev,
    isSearching,
    totalServerMatches,
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
        placeholder={t('searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-8 flex-1"
      />
      {query && (
        <span className={cn(
          'text-sm shrink-0 tabular-nums',
          !isSearching && totalServerMatches === 0 ? 'text-destructive' : 'text-muted-foreground'
        )}>
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : totalServerMatches === 0 ? (
            t('noResults')
          ) : (
            `${currentMatchIndex + 1}/${totalServerMatches}`
          )}
        </span>
      )}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={goToPrev}
          disabled={totalServerMatches === 0 || isSearching}
          title={t('prevMatch')}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={goToNext}
          disabled={totalServerMatches === 0 || isSearching}
          title={t('nextMatch')}
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
