'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface MermaidRendererProps {
  content: string;
  className?: string;
}

let mermaidInitialized = false;

function initMermaid() {
  if (mermaidInitialized) return;

  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'strict',
    fontFamily: 'inherit',
  });

  mermaidInitialized = true;
}

export function MermaidRenderer({ content, className }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const renderIdRef = useRef(0);

  const renderDiagram = useCallback(async (diagramContent: string, renderId: number) => {
    if (!diagramContent.trim()) {
      setSvg('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      initMermaid();
      const id = `mermaid-${Date.now()}-${renderId}`;
      const { svg: renderedSvg } = await mermaid.render(id, diagramContent);

      // 古いレンダリングリクエストは無視
      if (renderId !== renderIdRef.current) return;

      // SVGをサニタイズ
      const sanitizedSvg = DOMPurify.sanitize(renderedSvg, {
        USE_PROFILES: { svg: true, svgFilters: true },
      });

      setSvg(sanitizedSvg);
      setError(null);
    } catch (err) {
      // 古いレンダリングリクエストは無視
      if (renderId !== renderIdRef.current) return;

      const errorMessage = err instanceof Error ? err.message : 'ダイアグラムのレンダリングに失敗しました';
      setError(errorMessage);
      setSvg('');
    } finally {
      if (renderId === renderIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    renderIdRef.current += 1;
    const currentRenderId = renderIdRef.current;

    // デバウンス処理
    const timeoutId = setTimeout(() => {
      renderDiagram(content, currentRenderId);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [content, renderDiagram]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 px-4', className)}>
        <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-destructive font-medium">ダイアグラムの描画に失敗しました</p>
        <pre className="mt-2 text-xs text-muted-foreground max-w-full overflow-auto whitespace-pre-wrap">
          {error}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-muted-foreground', className)}>
        <p className="text-sm">ダイアグラムを入力してください</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('flex items-center justify-center overflow-auto [&_svg]:max-w-full', className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
