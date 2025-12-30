'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { DynamicFavicon } from '@/components/DynamicFavicon';
import { I18nProvider } from '@/i18n/provider';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DynamicFavicon />
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  );
}
