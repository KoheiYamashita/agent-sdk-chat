'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Message } from '@/types';
import type { SearchMessageResult } from '@/types/search';

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
  isSearching: boolean;
  totalServerMatches: number;
}

const MessageSearchContext = createContext<MessageSearchContextValue | null>(null);

interface MessageSearchProviderProps {
  children: React.ReactNode;
  sessionId: string | null;
  messages: Message[];
  loadMoreMessages: () => Promise<void>;
  hasMoreMessages: boolean;
  isLoadingMoreMessages: boolean;
}

async function searchMessagesApi(sessionId: string, query: string): Promise<SearchMessageResult[]> {
  const params = new URLSearchParams({ q: query, sessionId });
  const response = await fetch(`/api/search/messages?${params}`);
  if (!response.ok) {
    throw new Error('Failed to search messages');
  }
  const data = await response.json();
  return data.messages;
}

export function MessageSearchProvider({
  children,
  sessionId,
  messages,
  loadMoreMessages,
  hasMoreMessages,
  isLoadingMoreMessages,
}: MessageSearchProviderProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1); // -1 means not set yet
  const [isSearching, setIsSearching] = useState(false);
  const [serverMatchIds, setServerMatchIds] = useState<string[]>([]); // 古い順のID配列
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isLoadingRef = useRef(false);

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

  // サーバーサイド検索を実行（デバウンス付き）
  useEffect(() => {
    if (!query.trim() || !sessionId) {
      setServerMatchIds([]);
      setCurrentMatchIndex(-1);
      return;
    }

    // 前のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const timer = setTimeout(async () => {
      if (abortController.signal.aborted) return;

      setIsSearching(true);
      try {
        const results = await searchMessagesApi(sessionId, query.trim());
        if (!abortController.signal.aborted) {
          // 古い順でIDを保存
          setServerMatchIds(results.map((r) => r.id));
          // 最新のマッチ（末尾）から開始
          setCurrentMatchIndex(results.length > 0 ? results.length - 1 : -1);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('Failed to search messages:', err);
          setServerMatchIds([]);
          setCurrentMatchIndex(-1);
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
  }, [query, sessionId]);

  // ロード済みメッセージからマッチを計算（ハイライト用）
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

  // 現在のマッチ対象のメッセージIDを取得
  const currentTargetMessageId = serverMatchIds[currentMatchIndex] ?? null;

  // ロード済みメッセージIDのセット
  const loadedMessageIds = useMemo(() => new Set(messages.map((m) => m.id)), [messages]);

  // 現在のマッチがロードされているかチェック
  const isCurrentMatchLoaded = currentTargetMessageId
    ? loadedMessageIds.has(currentTargetMessageId)
    : true;

  // 未ロードのメッセージをロードする
  useEffect(() => {
    if (!isCurrentMatchLoaded && hasMoreMessages && !isLoadingMoreMessages && !isLoadingRef.current) {
      isLoadingRef.current = true;
      loadMoreMessages().finally(() => {
        isLoadingRef.current = false;
      });
    }
  }, [isCurrentMatchLoaded, hasMoreMessages, isLoadingMoreMessages, loadMoreMessages]);

  // 現在のマッチ位置にスクロール
  useEffect(() => {
    if (!isOpen || !currentTargetMessageId || !isCurrentMatchLoaded) return;

    // 少し遅延してDOMの更新を待つ
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const element = document.querySelector(
        `[data-message-id="${currentTargetMessageId}"]`
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
  }, [isOpen, currentTargetMessageId, isCurrentMatchLoaded]);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setServerMatchIds([]);
    setCurrentMatchIndex(-1);
  }, []);

  // 前へ（より新しいメッセージへ）
  const goToNext = useCallback(() => {
    if (serverMatchIds.length === 0) return;
    setCurrentMatchIndex((prev) => {
      if (prev >= serverMatchIds.length - 1) {
        // 末尾にいる場合は先頭（一番古い）へ
        return 0;
      }
      return prev + 1;
    });
  }, [serverMatchIds.length]);

  // 次へ（より古いメッセージへ）
  const goToPrev = useCallback(() => {
    if (serverMatchIds.length === 0) return;
    setCurrentMatchIndex((prev) => {
      if (prev <= 0) {
        // 先頭にいる場合は末尾（一番新しい）へ
        return serverMatchIds.length - 1;
      }
      return prev - 1;
    });
  }, [serverMatchIds.length]);

  // ロード済みマッチから現在のマッチを取得
  const currentMatch = useMemo(() => {
    if (!currentTargetMessageId) return null;
    // ロード済みメッセージ内で、現在のターゲットメッセージに対応するマッチを探す
    return matches.find((m) => m.messageId === currentTargetMessageId) ?? null;
  }, [matches, currentTargetMessageId]);

  const value = useMemo(
    () => ({
      query,
      setQuery,
      isOpen,
      open,
      close,
      matches,
      currentMatchIndex: currentMatchIndex >= 0 ? currentMatchIndex : 0,
      goToNext,
      goToPrev,
      currentMatch,
      isSearching,
      totalServerMatches: serverMatchIds.length,
    }),
    [query, isOpen, open, close, matches, currentMatchIndex, goToNext, goToPrev, currentMatch, isSearching, serverMatchIds.length]
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
