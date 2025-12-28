'use client';

import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

function BackButton() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/chat';

  return (
    <Link href={returnTo}>
      <Button variant="ghost" size="sm" className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        戻る
      </Button>
    </Link>
  );
}

export default function FilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4">
          <Suspense fallback={
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              戻る
            </Button>
          }>
            <BackButton />
          </Suspense>
          <h1 className="text-lg font-semibold">ファイル</h1>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4">{children}</main>
    </div>
  );
}
