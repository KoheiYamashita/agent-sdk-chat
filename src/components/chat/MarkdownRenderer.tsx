'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MermaidRenderer } from '@/components/workspace/MermaidRenderer';

interface MarkdownRendererProps {
  content: string;
  className?: string;
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

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children, ...props }) => {
            const isInline = !className;

            // Mermaidコードブロックの場合
            if (className?.includes('language-mermaid')) {
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
                {children}
              </code>
            ) : (
              <CodeBlock className={className}>{children}</CodeBlock>
            );
          },
          a: ({ children, href, ...props }) => (
            <a
              className="text-foreground/90 underline underline-offset-2 decoration-foreground/30 hover:decoration-foreground/60 transition-colors inline-flex items-center gap-1"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-border/50">
              <table className="w-full border-collapse" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-muted/50" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th
              className="px-4 py-2.5 text-left text-sm font-semibold text-foreground border-b border-border/50"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="px-4 py-2.5 text-sm border-b border-border/30 last:border-b-0"
              {...props}
            >
              {children}
            </td>
          ),
          tr: ({ children, ...props }) => (
            <tr
              className="hover:bg-muted/30 transition-colors"
              {...props}
            >
              {children}
            </tr>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
