'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

const SIDEBAR_WIDTH_KEY = 'sidebar-width';
const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

interface SidebarContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  width: number;
  setWidth: (width: number, saveToStorage?: boolean) => void;
  minWidth: number;
  maxWidth: number;
  // Chat reset functionality
  chatResetKey: number;
  resetChat: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidthState] = useState(DEFAULT_WIDTH);
  const [chatResetKey, setChatResetKey] = useState(0);

  useEffect(() => {
    const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (savedWidth) {
      const parsed = parseInt(savedWidth, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        setWidthState(parsed);
      }
    }
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const setOpen = useCallback((open: boolean) => setIsOpen(open), []);

  const setWidth = useCallback((newWidth: number, saveToStorage = false) => {
    const clampedWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
    setWidthState(clampedWidth);
    if (saveToStorage) {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clampedWidth));
    }
  }, []);

  const resetChat = useCallback(() => {
    setChatResetKey((prev) => prev + 1);
  }, []);

  return (
    <SidebarContext.Provider value={{
      isOpen, open, close, toggle, setOpen,
      width, setWidth, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH,
      chatResetKey, resetChat
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
