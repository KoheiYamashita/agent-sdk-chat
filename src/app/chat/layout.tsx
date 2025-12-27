'use client';

import { Sidebar, MobileSidebar } from '@/components/sidebar';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { TerminalProvider } from '@/contexts/TerminalContext';

function ChatLayoutContent({ children }: { children: React.ReactNode }) {
  const { isOpen, setOpen } = useSidebar();

  return (
    <div className="flex h-dvh">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar (Sheet) */}
      <MobileSidebar open={isOpen} onOpenChange={setOpen} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <TerminalProvider>
        <ChatLayoutContent>{children}</ChatLayoutContent>
      </TerminalProvider>
    </SidebarProvider>
  );
}
