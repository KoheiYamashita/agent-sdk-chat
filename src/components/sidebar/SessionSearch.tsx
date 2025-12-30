'use client';

import { Search, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SessionSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onClear: () => void;
  isSearching: boolean;
}

export function SessionSearch({
  query,
  onQueryChange,
  onClear,
  isSearching,
}: SessionSearchProps) {
  const t = useTranslations('session');
  return (
    <div className="px-4 pb-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="pl-8 pr-8 h-9"
        />
        {isSearching ? (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        ) : query ? (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={onClear}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
