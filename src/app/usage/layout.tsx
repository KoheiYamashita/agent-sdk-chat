'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function UsageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('usage');
  const tCommon = useTranslations('common');

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {tCommon('back')}
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">{t('title')}</h1>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
}
