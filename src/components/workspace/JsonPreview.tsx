'use client';

import { useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { AlertTriangle, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JsonPreviewProps {
  content: string;
  className?: string;
}

interface JsonNodeProps {
  data: unknown;
  name?: string;
  depth?: number;
  isLast?: boolean;
  itemsLabel: string;
  keysLabel: string;
}

function JsonNode({ data, name, depth = 0, isLast = true, itemsLabel, keysLabel }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);
  const isEmpty = isObject && Object.keys(data as object).length === 0;

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const renderValue = () => {
    if (data === null) {
      return <span className="text-orange-500">null</span>;
    }
    if (typeof data === 'boolean') {
      return <span className="text-purple-500">{String(data)}</span>;
    }
    if (typeof data === 'number') {
      return <span className="text-blue-500">{data}</span>;
    }
    if (typeof data === 'string') {
      return <span className="text-green-600 dark:text-green-400">&quot;{data}&quot;</span>;
    }
    return null;
  };

  if (!isObject) {
    return (
      <div className="flex items-start" style={{ paddingLeft: depth * 16 }}>
        {name !== undefined && (
          <>
            <span className="text-foreground">&quot;{name}&quot;</span>
            <span className="text-muted-foreground">: </span>
          </>
        )}
        {renderValue()}
        {!isLast && <span className="text-muted-foreground">,</span>}
      </div>
    );
  }

  const entries = Object.entries(data as object);
  const bracket = isArray ? ['[', ']'] : ['{', '}'];

  if (isEmpty) {
    return (
      <div className="flex items-start" style={{ paddingLeft: depth * 16 }}>
        {name !== undefined && (
          <>
            <span className="text-foreground">&quot;{name}&quot;</span>
            <span className="text-muted-foreground">: </span>
          </>
        )}
        <span className="text-muted-foreground">{bracket[0]}{bracket[1]}</span>
        {!isLast && <span className="text-muted-foreground">,</span>}
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex items-start cursor-pointer hover:bg-muted/50 rounded"
        style={{ paddingLeft: depth * 16 }}
        onClick={toggleExpand}
      >
        <span className="w-4 h-4 flex items-center justify-center mr-1 text-muted-foreground">
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
        {name !== undefined && (
          <>
            <span className="text-foreground">&quot;{name}&quot;</span>
            <span className="text-muted-foreground">: </span>
          </>
        )}
        <span className="text-muted-foreground">{bracket[0]}</span>
        {!isExpanded && (
          <>
            <span className="text-muted-foreground mx-1">...</span>
            <span className="text-muted-foreground">{bracket[1]}</span>
            <span className="text-xs text-muted-foreground ml-2">
              ({entries.length} {isArray ? itemsLabel : keysLabel})
            </span>
          </>
        )}
        {!isExpanded && !isLast && <span className="text-muted-foreground">,</span>}
      </div>
      {isExpanded && (
        <>
          {entries.map(([key, value], index) => (
            <JsonNode
              key={key}
              data={value}
              name={isArray ? undefined : key}
              depth={depth + 1}
              isLast={index === entries.length - 1}
              itemsLabel={itemsLabel}
              keysLabel={keysLabel}
            />
          ))}
          <div style={{ paddingLeft: depth * 16 }}>
            <span className="text-muted-foreground ml-5">{bracket[1]}</span>
            {!isLast && <span className="text-muted-foreground">,</span>}
          </div>
        </>
      )}
    </div>
  );
}

export function JsonPreview({ content, className }: JsonPreviewProps) {
  const t = useTranslations('json');
  const [copied, setCopied] = useState(false);

  const { parsed, error, formatted } = useMemo(() => {
    try {
      const parsedData = JSON.parse(content);
      const formattedJson = JSON.stringify(parsedData, null, 2);
      return { parsed: parsedData, error: null, formatted: formattedJson };
    } catch (err) {
      return {
        parsed: null,
        error: err instanceof Error ? err.message : 'PARSE_ERROR',
        formatted: null,
      };
    }
  }, [content]);

  const handleCopy = useCallback(async () => {
    if (!formatted) return;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy failed
    }
  }, [formatted]);

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 px-4', className)}>
        <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-destructive font-medium">{t('parseError')}</p>
        <pre className="mt-2 text-xs text-muted-foreground max-w-full overflow-auto whitespace-pre-wrap">
          {error === 'PARSE_ERROR' ? t('parseError') : error}
        </pre>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <div className="font-mono text-sm leading-relaxed overflow-auto p-4 bg-muted/30 rounded-lg">
        <JsonNode data={parsed} itemsLabel={t('items')} keysLabel={t('keys')} />
      </div>
    </div>
  );
}
