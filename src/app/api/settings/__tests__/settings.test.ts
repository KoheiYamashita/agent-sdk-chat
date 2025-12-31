import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    settings: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/constants/title-generation', () => ({
  DEFAULT_TITLE_GENERATION: {
    enabled: true,
    model: 'claude-3-5-haiku-20241022',
    prompt: 'Generate a title',
  },
}));

vi.mock('@/lib/constants/workspace-claude-md', () => ({
  DEFAULT_WORKSPACE_CLAUDE_MD: '# CLAUDE.md template',
}));

import { GET, PUT } from '../route';
import { prisma } from '@/lib/db/prisma';

const mockFindMany = prisma.settings.findMany as ReturnType<typeof vi.fn>;
const mockUpsert = prisma.settings.upsert as ReturnType<typeof vi.fn>;

describe('Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET /api/settings', () => {
    it('should return default settings when database is empty', async () => {
      mockFindMany.mockResolvedValue([]);

      const response = await GET();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.general).toBeDefined();
      expect(json.permissions).toBeDefined();
      expect(json.sandbox).toBeDefined();
      expect(json.appearance).toBeDefined();
      expect(json.titleGeneration).toBeDefined();
      expect(json.danger).toBeDefined();
    });

    it('should return saved settings from database', async () => {
      mockFindMany.mockResolvedValue([
        { key: 'general', value: JSON.stringify({ theme: 'dark', language: 'en' }) },
        { key: 'danger', value: JSON.stringify({ showUsage: true }) },
      ]);

      const response = await GET();

      const json = await response.json();
      expect(json.general.theme).toBe('dark');
      expect(json.general.language).toBe('en');
      expect(json.danger.showUsage).toBe(true);
    });

    it('should sanitize appearance settings from database', async () => {
      mockFindMany.mockResolvedValue([
        {
          key: 'appearance',
          value: JSON.stringify({
            userInitials: '<script>',
            userName: '<img onerror="alert(1)">',
            userImageUrl: 'javascript:alert(1)',
            botImageUrl: 'https://example.com/bot.png',
          }),
        },
      ]);

      const response = await GET();

      const json = await response.json();
      // XSS characters should be removed
      expect(json.appearance.userInitials).not.toContain('<');
      expect(json.appearance.userName).not.toContain('<');
      // Invalid URL should be empty
      expect(json.appearance.userImageUrl).toBe('');
      // Valid HTTPS URL should be preserved
      expect(json.appearance.botImageUrl).toBe('https://example.com/bot.png');
    });

    it('should return 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'));

      const response = await GET();

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/settings', () => {
    const createRequest = (body: unknown) => {
      return new Request('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    };

    it('should update general settings', async () => {
      mockUpsert.mockResolvedValue({});

      const response = await PUT(
        createRequest({
          general: { theme: 'dark', language: 'en' },
        })
      );

      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { key: 'general' },
        update: { value: JSON.stringify({ theme: 'dark', language: 'en' }) },
        create: { key: 'general', value: JSON.stringify({ theme: 'dark', language: 'en' }) },
      });
    });

    it('should update multiple settings categories', async () => {
      mockUpsert.mockResolvedValue({});

      await PUT(
        createRequest({
          general: { theme: 'light' },
          danger: { showUsage: true },
        })
      );

      expect(mockUpsert).toHaveBeenCalledTimes(2);
    });

    it('should sanitize appearance settings before saving', async () => {
      mockUpsert.mockResolvedValue({});

      await PUT(
        createRequest({
          appearance: {
            userInitials: 'ABC123',
            userName: '<script>alert("xss")</script>',
            userImageUrl: 'http://insecure.com/image.png', // HTTP not allowed
            botImageUrl: 'https://secure.com/image.png',
          },
        })
      );

      const upsertCall = mockUpsert.mock.calls.find(
        (call) => call[0].where.key === 'appearance'
      );
      const savedValue = JSON.parse(upsertCall[0].update.value);

      // Initials should be uppercased and truncated to 2 chars
      expect(savedValue.userInitials).toBe('AB');
      // XSS should be removed
      expect(savedValue.userName).not.toContain('<');
      // HTTP URL should be rejected (empty)
      expect(savedValue.userImageUrl).toBe('');
      // HTTPS URL should be preserved
      expect(savedValue.botImageUrl).toBe('https://secure.com/image.png');
    });

    it('should allow data: URLs for images', async () => {
      mockUpsert.mockResolvedValue({});

      await PUT(
        createRequest({
          appearance: {
            userImageUrl: 'data:image/png;base64,ABC123',
          },
        })
      );

      const upsertCall = mockUpsert.mock.calls.find(
        (call) => call[0].where.key === 'appearance'
      );
      const savedValue = JSON.parse(upsertCall[0].update.value);

      expect(savedValue.userImageUrl).toBe('data:image/png;base64,ABC123');
    });

    it('should return 500 on database error', async () => {
      mockUpsert.mockRejectedValue(new Error('DB error'));

      const response = await PUT(
        createRequest({ general: { theme: 'dark' } })
      );

      expect(response.status).toBe(500);
    });
  });
});
