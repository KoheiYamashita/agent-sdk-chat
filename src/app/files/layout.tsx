'use client';

import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

function BackButton() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/chat';
  const tCommon = useTranslations('common');

  return (
    <Link href={returnTo}>
      <Button variant="ghost" size="sm" className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        {tCommon('back')}
      </Button>
    </Link>
  );
}

function BackButtonFallback() {
  const tCommon = useTranslations('common');

  return (
    <Button variant="ghost" size="sm" className="gap-2">
      <ArrowLeft className="h-4 w-4" />
      {tCommon('back')}
    </Button>
  );
}

export default function FilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('files');

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4">
          <Suspense fallback={<BackButtonFallback />}>
            <BackButton />
          </Suspense>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4">{children}</main>
    </div>
  );
}
