'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, X, Loader2, FileText, AlertTriangle, Edit3, Eye, Columns } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { MermaidRenderer } from '@/components/workspace/MermaidRenderer';
import { JsonPreview } from '@/components/workspace/JsonPreview';
import { CsvPreview } from '@/components/workspace/CsvPreview';
import type { DirectoryItem, FileReadResponse } from '@/types/workspace';

type ViewMode = 'edit' | 'preview' | 'split';

interface FilePreviewProps {
  item: DirectoryItem | null;
  onClose: () => void;
  workspacePath?: string;
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

// Check if file is an image that can be previewed
function isImageFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'svg'];
  return imageExts.includes(ext);
}

// Check if file is binary (non-previewable)
function isNonPreviewableBinary(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const nonPreviewableExts = [
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'tar', 'gz', 'rar', '7z',
    'exe', 'dll', 'so', 'dylib',
    'mkv', 'avi',
    'ttf', 'otf', 'woff', 'woff2', 'eot',
  ];
  return nonPreviewableExts.includes(ext);
}

// Check if file supports preview mode
function isPreviewableFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const previewableExts = ['md', 'markdown', 'mmd', 'mermaid', 'html', 'htm', 'json', 'csv'];
  return previewableExts.includes(ext);
}

// Check if file is markdown
function isMarkdownFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ['md', 'markdown'].includes(ext);
}

// Check if file is mermaid
function isMermaidFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ['mmd', 'mermaid'].includes(ext);
}

// Check if file is HTML
function isHtmlFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ['html', 'htm'].includes(ext);
}

// Check if file is JSON
function isJsonFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ext === 'json';
}

// Check if file is CSV
function isCsvFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ext === 'csv';
}

// Check if file is a video
function isVideoFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
}

// Check if file is audio
function isAudioFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext);
}

// Check if file is PDF
function isPdfFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ext === 'pdf';
}

// Check if file is a media file (streamed via /api/workspace/file/stream)
function isMediaFile(name: string): boolean {
  return isImageFile(name) || isVideoFile(name) || isAudioFile(name) || isPdfFile(name);
}

export function FilePreview({
  item,
  onClose,
  workspacePath,
  className,
}: FilePreviewProps) {
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileReadResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');

  const isDirty = content !== originalContent;
  const isImage = item ? isImageFile(item.name) : false;
  const isVideo = item ? isVideoFile(item.name) : false;
  const isAudio = item ? isAudioFile(item.name) : false;
  const isPdf = item ? isPdfFile(item.name) : false;
  const isMedia = item ? isMediaFile(item.name) : false;
  const isPreviewable = item ? isPreviewableFile(item.name) : false;

  // Generate streaming URL for media files
  const streamUrl = item
    ? `/api/workspace/file/stream?path=${encodeURIComponent(item.path)}${workspacePath ? `&workspacePath=${encodeURIComponent(workspacePath)}` : ''}`
    : '';

  // Load file content
  const loadFile = useCallback(async () => {
    if (!item || item.isDirectory) return;

    // Media files are streamed directly, no need to load content
    if (isMediaFile(item.name)) {
      setIsLoading(false);
      return;
    }

    if (isNonPreviewableBinary(item.name)) {
      setError('このファイル形式は表示できません');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ path: item.path });
      if (workspacePath) params.set('workspacePath', workspacePath);
      const response = await fetch(`/api/workspace/file?${params}`);
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
  }, [item, workspacePath]);

  // Save file content
  const handleSave = useCallback(async () => {
    if (!item || !isDirty || isMedia) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/workspace/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: item.path,
          content,
          encoding: fileInfo?.encoding,
          workspacePath,
        }),
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
  }, [item, content, isDirty, isImage, fileInfo?.encoding, workspacePath]);

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
        <div className="flex items-center gap-2">
          {/* プレビュー可能なファイルのみ表示モード切り替えを表示 */}
          {isPreviewable && (
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value as ViewMode)}
              size="sm"
            >
              <ToggleGroupItem value="edit" aria-label="編集モード" title="編集">
                <Edit3 className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="preview" aria-label="プレビュー" title="プレビュー">
                <Eye className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="split" aria-label="分割表示" title="分割表示">
                <Columns className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          )}
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
      ) : isMedia ? (
        // メディアファイル（画像・動画・音声・PDF）のプレビュー
        isPdf ? (
          // PDFは全画面表示
          <div className="flex-1 flex flex-col p-2">
            <object
              data={streamUrl}
              type="application/pdf"
              className="w-full flex-1 rounded border"
            >
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  PDFを表示できません。
                  <a
                    href={streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline ml-1"
                  >
                    ダウンロード
                  </a>
                </p>
              </div>
            </object>
          </div>
        ) : isVideo ? (
          // 動画は領域内に収まるように表示
          <div className="flex-1 flex items-center justify-center p-4 bg-black/5 overflow-hidden">
            <video
              src={streamUrl}
              controls
              className="max-w-full max-h-full object-contain rounded"
              style={{ maxHeight: 'calc(100% - 2rem)' }}
            >
              お使いのブラウザは動画再生に対応していません
            </video>
          </div>
        ) : isImage ? (
          // 画像は領域内に収まるように表示
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <img
              src={streamUrl}
              alt={item.name}
              className="max-w-full max-h-full object-contain rounded"
              style={{ maxHeight: 'calc(100% - 2rem)' }}
            />
          </div>
        ) : (
          // 音声
          <div className="flex-1 flex items-center justify-center p-4">
            <audio
              src={streamUrl}
              controls
              className="w-full max-w-md"
            >
              お使いのブラウザは音声再生に対応していません
            </audio>
          </div>
        )
      ) : isPreviewable ? (
        // プレビュー可能なファイルの表示
        <div className={cn('flex-1 flex min-h-0', viewMode === 'split' && 'gap-0')}>
          {/* エディター (edit または split モード) */}
          {(viewMode === 'edit' || viewMode === 'split') && (
            <ScrollArea className={cn('flex-1', viewMode === 'split' && 'border-r')}>
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

          {/* プレビュー (preview または split モード) */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            isHtmlFile(item.name) ? (
              // HTMLは全画面表示
              <div className="flex-1 flex flex-col p-2">
                <iframe
                  srcDoc={content}
                  sandbox="allow-scripts"
                  className="w-full flex-1 border rounded bg-white"
                  title={`${item.name} preview`}
                />
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {isMarkdownFile(item.name) ? (
                    <MarkdownRenderer content={content} />
                  ) : isMermaidFile(item.name) ? (
                    <MermaidRenderer content={content} />
                  ) : isJsonFile(item.name) ? (
                    <JsonPreview content={content} />
                  ) : isCsvFile(item.name) ? (
                    <CsvPreview content={content} />
                  ) : null}
                </div>
              </ScrollArea>
            )
          )}
        </div>
      ) : (
        // 通常のテキストファイル
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
