'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { SessionSearchResponse, SearchSessionResult } from '@/types/search';

interface UseSessionSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: SearchSessionResult[] | null;
  isSearching: boolean;
  error: Error | null;
  clearSearch: () => void;
}

async function searchSessions(query: string): Promise<SessionSearchResponse> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/search/sessions?${params}`);

  if (!response.ok) {
    throw new Error('Failed to search sessions');
  }

  return response.json();
}

export function useSessionSearch(): UseSessionSearchResult {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchSessionResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // クエリが空の場合は結果をクリア
    if (!query.trim()) {
      setResults(null);
      setError(null);
      return;
    }

    // 以前のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // デバウンス（300ms）
    const timer = setTimeout(async () => {
      if (abortController.signal.aborted) return;

      setIsSearching(true);
      setError(null);

      try {
        const response = await searchSessions(query.trim());
        if (!abortController.signal.aborted) {
          setResults(response.sessions);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err : new Error('Search failed'));
          setResults(null);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [query]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    error,
    clearSearch,
  };
}
