import { prisma } from '@/lib/db/prisma';

// Import translation files
import jaMessages from '../../../messages/ja.json';
import enMessages from '../../../messages/en.json';
import zhMessages from '../../../messages/zh.json';

type Messages = typeof jaMessages;
type Locale = 'ja' | 'en' | 'zh';

const messages: Record<Locale, Messages> = {
  ja: jaMessages,
  en: enMessages,
  zh: zhMessages,
};

/**
 * Get the user's preferred locale from settings
 */
export async function getServerLocale(): Promise<Locale> {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'general' },
    });

    if (setting?.value) {
      const generalSettings = JSON.parse(setting.value);
      if (generalSettings.language && messages[generalSettings.language as Locale]) {
        return generalSettings.language as Locale;
      }
    }
  } catch {
    // Fall back to default
  }

  return 'ja'; // Default locale
}

/**
 * Get a translation value by key path (e.g., "chat.newChat")
 */
export function getServerTranslation(locale: Locale, keyPath: string): string {
  const keys = keyPath.split('.');
  let value: unknown = messages[locale];

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      // Fallback to Japanese if key not found
      value = messages['ja'];
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          return keyPath; // Return key path if not found
        }
      }
      break;
    }
  }

  return typeof value === 'string' ? value : keyPath;
}

/**
 * Create a translation function for server-side use
 */
export async function createServerTranslator(namespace?: string) {
  const locale = await getServerLocale();

  return (key: string, params?: Record<string, string | number>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    let translation = getServerTranslation(locale, fullKey);

    // Simple parameter interpolation
    if (params) {
      for (const [param, value] of Object.entries(params)) {
        translation = translation.replace(`{${param}}`, String(value));
      }
    }

    return translation;
  };
}
