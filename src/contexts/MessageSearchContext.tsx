'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Message } from '@/types';

export interface SearchMatch {
  messageId: string;
  index: number; // グローバルマッチインデックス（ナビゲーション用）
  field: 'content' | 'model'; // マッチした場所を識別
  matchIndexInField: number; // フィールド内でのマッチインデックス
}

interface MessageSearchContextValue {
  query: string;
  setQuery: (query: string) => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  matches: SearchMatch[];
  currentMatchIndex: number;
  goToNext: () => void;
  goToPrev: () => void;
  currentMatch: SearchMatch | null;
}

const MessageSearchContext = createContext<MessageSearchContextValue | null>(null);

interface MessageSearchProviderProps {
  children: React.ReactNode;
  messages: Message[];
}

export function MessageSearchProvider({ children, messages }: MessageSearchProviderProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cmd/Ctrl + F でメッセージ検索を開く
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        // メッセージがある場合のみ検索を開く
        if (messages.length > 0) {
          e.preventDefault();
          setIsOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [messages.length]);

  // 検索マッチを計算（content + model/modelDisplayName）
  const matches = useMemo(() => {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase();
    const result: SearchMatch[] = [];
    let globalIndex = 0;

    messages.forEach((message) => {
      if (message.role === 'tool_approval') return;

      // コンテンツ内のマッチを検索
      const content = message.content.toLowerCase();
      let pos = 0;
      let matchIndexInField = 0;

      while ((pos = content.indexOf(searchTerm, pos)) !== -1) {
        result.push({
          messageId: message.id,
          index: globalIndex++,
          field: 'content',
          matchIndexInField: matchIndexInField++,
        });
        pos += searchTerm.length;
      }

      // モデル名のマッチを検索（displayName優先、なければmodel）
      const modelName = (message.modelDisplayName || message.model || '').toLowerCase();
      if (modelName && modelName.includes(searchTerm)) {
        // モデル名は通常1つのマッチのみ
        result.push({
          messageId: message.id,
          index: globalIndex++,
          field: 'model',
          matchIndexInField: 0,
        });
      }
    });

    return result;
  }, [messages, query]);

  // マッチ数が変わったらインデックスを調整
  const adjustedMatchIndex = useMemo(() => {
    if (matches.length === 0) return 0;
    if (currentMatchIndex >= matches.length) return matches.length - 1;
    return currentMatchIndex;
  }, [matches.length, currentMatchIndex]);

  // 現在のマッチ位置にスクロール
  useEffect(() => {
    if (!isOpen || matches.length === 0) return;

    const match = matches[adjustedMatchIndex];
    if (!match) return;

    // 少し遅延してDOMの更新を待つ
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const element = document.querySelector(
        `[data-message-id="${match.messageId}"]`
      );
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isOpen, matches, adjustedMatchIndex]);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setCurrentMatchIndex(0);
  }, []);

  const goToNext = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  const goToPrev = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const currentMatch = matches[adjustedMatchIndex] ?? null;

  const value = useMemo(
    () => ({
      query,
      setQuery,
      isOpen,
      open,
      close,
      matches,
      currentMatchIndex: adjustedMatchIndex,
      goToNext,
      goToPrev,
      currentMatch,
    }),
    [query, isOpen, open, close, matches, adjustedMatchIndex, goToNext, goToPrev, currentMatch]
  );

  return (
    <MessageSearchContext.Provider value={value}>
      {children}
    </MessageSearchContext.Provider>
  );
}

export function useMessageSearch() {
  const context = useContext(MessageSearchContext);
  if (!context) {
    throw new Error('useMessageSearch must be used within MessageSearchProvider');
  }
  return context;
}
