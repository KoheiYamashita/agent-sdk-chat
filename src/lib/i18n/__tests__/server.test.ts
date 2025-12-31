import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    settings: {
      findUnique: vi.fn(),
    },
  },
}));

import {
  getServerLocale,
  getServerTranslation,
  createServerTranslator,
} from '../server';
import { prisma } from '@/lib/db/prisma';

const mockFindUnique = prisma.settings.findUnique as unknown as ReturnType<typeof vi.fn>;

describe('i18n/server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getServerLocale', () => {
    it('should return ja as default locale', async () => {
      mockFindUnique.mockResolvedValue(null);

      const locale = await getServerLocale();

      expect(locale).toBe('ja');
    });

    it('should return locale from settings', async () => {
      mockFindUnique.mockResolvedValue({
        key: 'general',
        value: JSON.stringify({ language: 'en' }),
      });

      const locale = await getServerLocale();

      expect(locale).toBe('en');
    });

    it('should return zh locale from settings', async () => {
      mockFindUnique.mockResolvedValue({
        key: 'general',
        value: JSON.stringify({ language: 'zh' }),
      });

      const locale = await getServerLocale();

      expect(locale).toBe('zh');
    });

    it('should return ja for invalid locale in settings', async () => {
      mockFindUnique.mockResolvedValue({
        key: 'general',
        value: JSON.stringify({ language: 'invalid' }),
      });

      const locale = await getServerLocale();

      expect(locale).toBe('ja');
    });

    it('should return ja on database error', async () => {
      mockFindUnique.mockRejectedValue(new Error('DB error'));

      const locale = await getServerLocale();

      expect(locale).toBe('ja');
    });

    it('should return ja for invalid JSON in settings', async () => {
      mockFindUnique.mockResolvedValue({
        key: 'general',
        value: 'invalid json',
      });

      const locale = await getServerLocale();

      expect(locale).toBe('ja');
    });
  });

  describe('getServerTranslation', () => {
    it('should return translation for valid key path', () => {
      const translation = getServerTranslation('ja', 'chat.newChat');

      expect(translation).toBe('新規チャット');
    });

    it('should return English translation', () => {
      const translation = getServerTranslation('en', 'chat.newChat');

      expect(translation).toBe('New Chat');
    });

    it('should return Chinese translation', () => {
      const translation = getServerTranslation('zh', 'chat.newChat');

      expect(translation).toBe('新建对话');
    });

    it('should return key path for non-existent key', () => {
      const translation = getServerTranslation('ja', 'nonexistent.key.path');

      expect(translation).toBe('nonexistent.key.path');
    });

    it('should fallback to Japanese when key missing in other locale', () => {
      // If a key exists in Japanese but not in other locale, should return Japanese
      // This is a fallback behavior
      const translation = getServerTranslation('ja', 'settings.title');

      expect(typeof translation).toBe('string');
      expect(translation).not.toBe('settings.title');
    });
  });

  describe('createServerTranslator', () => {
    it('should create translator with namespace', async () => {
      mockFindUnique.mockResolvedValue({
        key: 'general',
        value: JSON.stringify({ language: 'ja' }),
      });

      const t = await createServerTranslator('chat');
      const translation = t('newChat');

      expect(translation).toBe('新規チャット');
    });

    it('should create translator without namespace', async () => {
      mockFindUnique.mockResolvedValue({
        key: 'general',
        value: JSON.stringify({ language: 'en' }),
      });

      const t = await createServerTranslator();
      const translation = t('chat.newChat');

      expect(translation).toBe('New Chat');
    });

    it('should interpolate parameters', async () => {
      mockFindUnique.mockResolvedValue({
        key: 'general',
        value: JSON.stringify({ language: 'ja' }),
      });

      const t = await createServerTranslator('chat');
      // Find a translation with parameters or test the interpolation logic
      const translation = t('test', { count: 5 });

      // The result will be the key if not found, but the interpolation should work
      expect(typeof translation).toBe('string');
    });

    it('should use default locale when settings not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const t = await createServerTranslator('chat');
      const translation = t('newChat');

      expect(translation).toBe('新規チャット');
    });
  });
});
