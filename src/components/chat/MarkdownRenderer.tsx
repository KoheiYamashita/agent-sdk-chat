'use client';

import { useState, useCallback, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MermaidRenderer } from '@/components/workspace/MermaidRenderer';
import { HighlightedText } from './HighlightedText';
import type { SearchMatch } from '@/contexts/MessageSearchContext';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  searchQuery?: string;
  messageId?: string;
  currentMatch?: SearchMatch | null;
}

/**
 * テキスト内の検索クエリのマッチ数をカウント
 */
function countMatches(text: string, query: string): number {
  if (!query) return 0;
  const searchTerm = query.toLowerCase();
  const lowerText = text.toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = lowerText.indexOf(searchTerm, pos)) !== -1) {
    count++;
    pos += searchTerm.length;
  }
  return count;
}

/**
 * 子要素内のテキストを再帰的にハイライト処理する
 * matchCounter: 累積マッチ数を追跡するためのミュータブルオブジェクト
 */
function processChildren(
  children: ReactNode,
  searchQuery: string,
  messageId: string,
  currentMatch: SearchMatch | null,
  matchCounter: { count: number }
): ReactNode {
  if (!searchQuery) return children;

  if (typeof children === 'string') {
    const currentOffset = matchCounter.count;
    const matchesInThisChunk = countMatches(children, searchQuery);
    matchCounter.count += matchesInThisChunk;

    return (
      <HighlightedText
        text={children}
        query={searchQuery}
        messageId={messageId}
        field="content"
        currentMatch={currentMatch}
        matchOffset={currentOffset}
      />
    );
  }

  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === 'string') {
        const currentOffset = matchCounter.count;
        const matchesInThisChunk = countMatches(child, searchQuery);
        matchCounter.count += matchesInThisChunk;

        return (
          <HighlightedText
            key={i}
            text={child}
            query={searchQuery}
            messageId={messageId}
            field="content"
            currentMatch={currentMatch}
            matchOffset={currentOffset}
          />
        );
      }
      return child;
    });
  }

  return children;
}

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  // 言語名を抽出
  const match = className?.match(/language-(\w+)/);
  const language = match ? match[1] : '';

  const handleCopy = useCallback(async () => {
    const code = String(children).replace(/\n$/, '');
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className="group relative my-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between rounded-t-lg bg-muted/80 px-4 py-2 border-b border-border/30">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="コードをコピー"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-500">コピー済み</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>コピー</span>
            </>
          )}
        </button>
      </div>
      {/* コード本体 */}
      <pre className="overflow-x-auto rounded-b-lg bg-muted/50 p-4 text-sm !mt-0">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

export function MarkdownRenderer({
  content,
  className,
  searchQuery,
  messageId,
  currentMatch,
}: MarkdownRendererProps) {
  // 累積マッチ数を追跡するためのカウンターオブジェクト（レンダリング毎に新規作成）
  const matchCounter = { count: 0 };

  // 検索ハイライト用のヘルパー関数
  const highlightText = (children: ReactNode) => {
    if (!searchQuery || !messageId) return children;
    return processChildren(children, searchQuery, messageId, currentMatch ?? null, matchCounter);
  };

  // 検索ハイライト用のコンポーネント設定
  const components = {
    pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
    code: ({ className: codeClassName, children, ...props }: { className?: string; children?: ReactNode }) => {
      const isInline = !codeClassName;

      // Mermaidコードブロックの場合
      if (codeClassName?.includes('language-mermaid')) {
        const code = String(children).replace(/\n$/, '');
        return (
          <div className="my-4 p-4 bg-muted/30 rounded-lg overflow-auto">
            <MermaidRenderer content={code} />
          </div>
        );
      }

      return isInline ? (
        <code
          className="rounded bg-muted/70 px-1.5 py-0.5 text-sm font-mono text-foreground/90"
          {...props}
        >
          {highlightText(children)}
        </code>
      ) : (
        <CodeBlock className={codeClassName}>{children}</CodeBlock>
      );
    },
    // 段落内のテキストをハイライト
    p: ({ children, ...props }: { children?: ReactNode }) => (
      <p {...props}>{highlightText(children)}</p>
    ),
    // リスト項目内のテキストをハイライト
    li: ({ children, ...props }: { children?: ReactNode }) => (
      <li {...props}>{highlightText(children)}</li>
    ),
    // 見出し内のテキストをハイライト
    h1: ({ children, ...props }: { children?: ReactNode }) => (
      <h1 {...props}>{highlightText(children)}</h1>
    ),
    h2: ({ children, ...props }: { children?: ReactNode }) => (
      <h2 {...props}>{highlightText(children)}</h2>
    ),
    h3: ({ children, ...props }: { children?: ReactNode }) => (
      <h3 {...props}>{highlightText(children)}</h3>
    ),
    h4: ({ children, ...props }: { children?: ReactNode }) => (
      <h4 {...props}>{highlightText(children)}</h4>
    ),
    strong: ({ children, ...props }: { children?: ReactNode }) => (
      <strong {...props}>{highlightText(children)}</strong>
    ),
    em: ({ children, ...props }: { children?: ReactNode }) => (
      <em {...props}>{highlightText(children)}</em>
    ),
    a: ({ children, href, ...props }: { children?: ReactNode; href?: string }) => (
      <a
        className="text-foreground/90 underline underline-offset-2 decoration-foreground/30 hover:decoration-foreground/60 transition-colors inline-flex items-center gap-1"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {highlightText(children)}
        <ExternalLink className="h-3 w-3 opacity-50" />
      </a>
    ),
    table: ({ children, ...props }: { children?: ReactNode }) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-border/50">
        <table className="w-full border-collapse" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: { children?: ReactNode }) => (
      <thead className="bg-muted/50" {...props}>
        {children}
      </thead>
    ),
    th: ({ children, ...props }: { children?: ReactNode }) => (
      <th
        className="px-4 py-2.5 text-left text-sm font-semibold text-foreground border-b border-border/50"
        {...props}
      >
        {highlightText(children)}
      </th>
    ),
    td: ({ children, ...props }: { children?: ReactNode }) => (
      <td
        className="px-4 py-2.5 text-sm border-b border-border/30 last:border-b-0"
        {...props}
      >
        {highlightText(children)}
      </td>
    ),
    tr: ({ children, ...props }: { children?: ReactNode }) => (
      <tr className="hover:bg-muted/30 transition-colors" {...props}>
        {children}
      </tr>
    ),
  };

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
