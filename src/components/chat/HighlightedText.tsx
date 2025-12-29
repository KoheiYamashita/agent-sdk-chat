'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { SearchMatch } from '@/contexts/MessageSearchContext';

interface HighlightedTextProps {
  text: string;
  query: string;
  messageId: string;
  field: 'content' | 'model';
  currentMatch: SearchMatch | null;
  matchOffset?: number; // 前のチャンクで見つかったマッチ数（累積オフセット）
}

/**
 * テキスト内の検索キーワードをハイライト表示するコンポーネント
 * - 現在のマッチ: オレンジ色
 * - その他のマッチ: 黄色
 */
export function HighlightedText({
  text,
  query,
  messageId,
  field,
  currentMatch,
  matchOffset = 0,
}: HighlightedTextProps) {
  const parts = useMemo(() => {
    if (!query.trim()) {
      return [{ text, isMatch: false, matchIndexInField: -1 }];
    }

    const searchTerm = query.toLowerCase();
    const result: { text: string; isMatch: boolean; matchIndexInField: number }[] = [];
    let lastIndex = 0;
    let matchIndexInField = 0;

    const lowerText = text.toLowerCase();
    let index = lowerText.indexOf(searchTerm);

    while (index !== -1) {
      // マッチ前のテキスト
      if (index > lastIndex) {
        result.push({
          text: text.slice(lastIndex, index),
          isMatch: false,
          matchIndexInField: -1,
        });
      }

      // マッチしたテキスト
      result.push({
        text: text.slice(index, index + searchTerm.length),
        isMatch: true,
        matchIndexInField: matchIndexInField,
      });

      lastIndex = index + searchTerm.length;
      matchIndexInField++;
      index = lowerText.indexOf(searchTerm, lastIndex);
    }

    // 残りのテキスト
    if (lastIndex < text.length) {
      result.push({
        text: text.slice(lastIndex),
        isMatch: false,
        matchIndexInField: -1,
      });
    }

    return result;
  }, [text, query]);

  return (
    <>
      {parts.map((part, i) => {
        if (!part.isMatch) {
          return <span key={i}>{part.text}</span>;
        }

        // 現在のマッチかどうか判定
        // matchOffsetを加えてグローバルなmatchIndexInFieldと比較
        const globalMatchIndex = matchOffset + part.matchIndexInField;
        const isCurrent =
          currentMatch !== null &&
          currentMatch.messageId === messageId &&
          currentMatch.field === field &&
          currentMatch.matchIndexInField === globalMatchIndex;

        return (
          <mark
            key={i}
            data-search-match={`${field}-${globalMatchIndex}`}
            className={cn(
              'rounded px-0.5',
              isCurrent
                ? 'bg-orange-400 dark:bg-orange-500'
                : 'bg-yellow-200 dark:bg-yellow-600/50'
            )}
          >
            {part.text}
          </mark>
        );
      })}
    </>
  );
}
