'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2, Circle } from 'lucide-react';
import { Terminal } from './Terminal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TerminalPanelProps {
  chatSessionId: string;
  workspacePath: string;
  isOpen: boolean;
  onClose: () => void;
}

const MIN_HEIGHT = 150;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 300;
const STORAGE_KEY = 'terminal-panel-height';

export function TerminalPanel({
  chatSessionId,
  workspacePath,
  isOpen,
  onClose,
}: TerminalPanelProps) {
  const [height, setHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_HEIGHT && parsed <= MAX_HEIGHT) {
          return parsed;
        }
      }
    }
    return DEFAULT_HEIGHT;
  });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Save height to localStorage
  useEffect(() => {
    if (!isMaximized) {
      localStorage.setItem(STORAGE_KEY, height.toString());
    }
  }, [height, isMaximized]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const startY = e.clientY;
      const startHeight = height;

      const handleMouseMove = (e: MouseEvent) => {
        // Dragging up increases height
        const delta = startY - e.clientY;
        const newHeight = Math.min(Math.max(startHeight + delta, MIN_HEIGHT), MAX_HEIGHT);
        setHeight(newHeight);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [height]
  );

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    if (connected) {
      setError(null);
    }
  }, []);

  const handleError = useCallback((err: string) => {
    setError(err);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        'border-t bg-background flex flex-col',
        isMaximized && 'fixed inset-0 z-50'
      )}
      style={{ height: isMaximized ? '100%' : `${height}px` }}
    >
      {/* Resize handle */}
      {!isMaximized && (
        <div
          className={cn(
            'h-1 cursor-row-resize hover:bg-primary/20 transition-colors flex-shrink-0',
            isResizing && 'bg-primary/30'
          )}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Terminal</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Circle
              className={cn(
                'h-2 w-2',
                isConnected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'
              )}
            />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          {error && (
            <span className="text-xs text-destructive">{error}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Terminal */}
      <div className="flex-1 overflow-hidden min-h-0">
        <Terminal
          chatSessionId={chatSessionId}
          workspacePath={workspacePath}
          onConnectionChange={handleConnectionChange}
          onError={handleError}
        />
      </div>
    </div>
  );
}
