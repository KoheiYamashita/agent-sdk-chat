'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';

const TERMINAL_PORT = process.env.NEXT_PUBLIC_TERMINAL_PORT || '3001';

// Dynamically determine WebSocket URL based on current host
function getTerminalWsUrl(): string {
  if (typeof window === 'undefined') {
    return `ws://localhost:${TERMINAL_PORT}`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  return `${protocol}//${host}:${TERMINAL_PORT}`;
}

interface TerminalContextValue {
  isOpen: boolean;
  openTerminal: () => void;
  closeTerminal: () => void;
  toggleTerminal: () => void;
  // Destroy PTY session when switching chat sessions
  destroySession: (chatSessionId: string) => void;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingMessagesRef = useRef<string[]>([]);

  // Send a message to the WebSocket, queueing if not yet connected
  const sendMessage = useCallback((message: string) => {
    const ws = wsRef.current;

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(message);
      return;
    }

    if (ws?.readyState === WebSocket.CONNECTING) {
      // Queue message to send when connected
      pendingMessagesRef.current.push(message);
      return;
    }

    // Create new WebSocket connection
    try {
      const newWs = new WebSocket(getTerminalWsUrl());
      wsRef.current = newWs;
      pendingMessagesRef.current.push(message);

      newWs.onopen = () => {
        // Send all pending messages
        const pending = pendingMessagesRef.current;
        pendingMessagesRef.current = [];
        for (const msg of pending) {
          if (newWs.readyState === WebSocket.OPEN) {
            newWs.send(msg);
          }
        }
      };

      newWs.onclose = () => {
        wsRef.current = null;
      };

      newWs.onerror = () => {
        wsRef.current = null;
        pendingMessagesRef.current = [];
      };
    } catch {
      // Failed to create WebSocket
    }
  }, []);

  const openTerminal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeTerminal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleTerminal = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const destroySession = useCallback((chatSessionId: string) => {
    sendMessage(JSON.stringify({
      type: 'destroy',
      chatSessionId,
    }));
  }, [sendMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return (
    <TerminalContext.Provider
      value={{
        isOpen,
        openTerminal,
        closeTerminal,
        toggleTerminal,
        destroySession,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
}
