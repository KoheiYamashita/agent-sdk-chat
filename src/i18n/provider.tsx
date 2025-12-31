'use client';

import { useEffect } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { useSettings } from '@/hooks/useSettings';
import { getLocaleFromNavigator, isValidLocale, type Locale } from './config';

// Import all translation files
import ja from '../../messages/ja.json';
import en from '../../messages/en.json';
import zh from '../../messages/zh.json';

const messages: Record<Locale, typeof ja> = { ja, en, zh };

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const { settings, isLoading } = useSettings();

  // Determine locale: settings > OS language > fallback to Japanese
  let locale: Locale;

  if (isLoading) {
    // While loading settings, use OS language
    locale = getLocaleFromNavigator();
  } else {
    const settingsLanguage = settings?.general?.language;
    if (settingsLanguage && isValidLocale(settingsLanguage)) {
      locale = settingsLanguage;
    } else {
      locale = getLocaleFromNavigator();
    }
  }

  // Update html lang attribute when locale changes
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale]}
      timeZone="Asia/Tokyo"
    >
      {children}
    </NextIntlClientProvider>
  );
}
