'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import type { TerminalClientMessage, TerminalServerMessage } from '@/types/terminal';

interface TerminalProps {
  chatSessionId: string;
  workspacePath: string;
  onReady?: () => void;
  onError?: (error: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

// Get WebSocket URL for terminal (same origin, /api/terminal path)
function getTerminalWsUrl(): string {
  if (typeof window === 'undefined') {
    return 'ws://localhost:3000/api/terminal';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host; // includes port if non-standard
  return `${protocol}//${host}/api/terminal`;
}

export function Terminal({
  chatSessionId,
  workspacePath,
  onReady,
  onError,
  onConnectionChange,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const sendMessage = useCallback((message: TerminalClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(getTerminalWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Terminal WebSocket connected');
      onConnectionChange?.(true);

      // Request to create or reconnect to session
      sendMessage({
        type: 'create',
        chatSessionId,
        workspacePath,
      });
    };

    ws.onmessage = (event) => {
      try {
        const message: TerminalServerMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'ready':
            console.log('Terminal session ready:', message.sessionId);
            onReady?.();
            break;

          case 'reconnect':
            console.log('Reconnected to terminal session');
            // Write buffered output
            if (message.buffer && terminalRef.current) {
              terminalRef.current.write(message.buffer);
            }
            onReady?.();
            break;

          case 'output':
            if (message.data && terminalRef.current) {
              terminalRef.current.write(message.data);
            }
            break;

          case 'error':
            console.error('Terminal error:', message.error);
            onError?.(message.error || 'Unknown error');
            break;

          case 'pong':
            // Heartbeat response
            break;
        }
      } catch (error) {
        console.error('Failed to parse terminal message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Terminal WebSocket closed');
      onConnectionChange?.(false);

      // Attempt to reconnect after a delay using ref to avoid stale closure
      reconnectTimeoutRef.current = setTimeout(() => {
        if (terminalRef.current) {
          connectRef.current();
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('Terminal WebSocket error:', error);
      onError?.('WebSocket connection error');
    };
  }, [chatSessionId, workspacePath, onReady, onError, onConnectionChange, sendMessage]);

  // Keep connectRef updated with latest connect function
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Initialize terminal and WebSocket
  useEffect(() => {
    if (!containerRef.current) return;

    // Create terminal
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'var(--font-geist-mono), "Fira Code", "Cascadia Code", Consolas, monospace',
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
        cursorAccent: '#1e1e2e',
        selectionBackground: '#585b70',
        black: '#45475a',
        red: '#f38ba8',
        green: '#a6e3a1',
        yellow: '#f9e2af',
        blue: '#89b4fa',
        magenta: '#f5c2e7',
        cyan: '#94e2d5',
        white: '#bac2de',
        brightBlack: '#585b70',
        brightRed: '#f38ba8',
        brightGreen: '#a6e3a1',
        brightYellow: '#f9e2af',
        brightBlue: '#89b4fa',
        brightMagenta: '#f5c2e7',
        brightCyan: '#94e2d5',
        brightWhite: '#a6adc8',
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);

    // Initial fit
    setTimeout(() => {
      fitAddon.fit();
    }, 0);

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle user input
    term.onData((data) => {
      sendMessage({ type: 'input', data });
    });

    // Connect to WebSocket
    connect();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit();
        sendMessage({
          type: 'resize',
          cols: terminalRef.current.cols,
          rows: terminalRef.current.rows,
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      resizeObserver.disconnect();
      wsRef.current?.close();
      term.dispose();
    };
  }, [chatSessionId, workspacePath, connect, sendMessage]);

  // Handle session change - destroy old and create new
  useEffect(() => {
    return () => {
      // When unmounting or session changes, just close WebSocket
      // The server will keep the PTY alive for reconnection
      wsRef.current?.close();
    };
  }, [chatSessionId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{
        padding: '8px',
        backgroundColor: '#1e1e2e',
      }}
    />
  );
}
