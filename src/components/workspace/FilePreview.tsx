'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, X, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DirectoryItem, FileReadResponse } from '@/types/workspace';

interface FilePreviewProps {
  item: DirectoryItem | null;
  onClose: () => void;
  className?: string;
}

// Get language for syntax highlighting hint
function getLanguage(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    html: 'html',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'bash',
    bash: 'bash',
  };
  return langMap[ext] || 'text';
}

// Check if file is likely binary
function isBinaryFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const binaryExts = [
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'svg',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'tar', 'gz', 'rar', '7z',
    'exe', 'dll', 'so', 'dylib',
    'mp3', 'mp4', 'wav', 'avi', 'mov', 'mkv',
    'ttf', 'otf', 'woff', 'woff2', 'eot',
  ];
  return binaryExts.includes(ext);
}

export function FilePreview({
  item,
  onClose,
  className,
}: FilePreviewProps) {
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileReadResponse | null>(null);

  const isDirty = content !== originalContent;

  // Load file content
  const loadFile = useCallback(async () => {
    if (!item || item.isDirectory) return;

    if (isBinaryFile(item.name)) {
      setError('バイナリファイルは表示できません');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspace/file?path=${encodeURIComponent(item.path)}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load file');
      }
      const data: FileReadResponse = await response.json();
      setContent(data.content);
      setOriginalContent(data.content);
      setFileInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setIsLoading(false);
    }
  }, [item]);

  // Save file content
  const handleSave = useCallback(async () => {
    if (!item || !isDirty) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/workspace/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: item.path, content }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save file');
      }
      setOriginalContent(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  }, [item, content, isDirty]);

  // Load file when item changes
  useEffect(() => {
    if (item && !item.isDirectory) {
      loadFile();
    } else {
      setContent('');
      setOriginalContent('');
      setFileInfo(null);
      setError(null);
    }
  }, [item, loadFile]);

  if (!item) {
    return (
      <div className={cn('flex items-center justify-center h-full text-muted-foreground', className)}>
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">ファイルを選択してください</p>
        </div>
      </div>
    );
  }

  if (item.isDirectory) {
    return (
      <div className={cn('flex items-center justify-center h-full text-muted-foreground', className)}>
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">フォルダは表示できません</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">{item.name}</span>
          {isDirty && (
            <span className="text-xs text-muted-foreground">(未保存)</span>
          )}
          {fileInfo && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {(fileInfo.size / 1024).toFixed(1)} KB
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="h-7 px-2"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span className="ml-1 hidden sm:inline">保存</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={cn(
              'w-full h-full min-h-[300px] resize-none border-0 rounded-none',
              'font-mono text-sm leading-relaxed',
              'focus-visible:ring-0 focus-visible:ring-offset-0'
            )}
            placeholder="ファイルの内容がここに表示されます"
            spellCheck={false}
            data-language={getLanguage(item.name)}
          />
        </ScrollArea>
      )}
    </div>
  );
}
