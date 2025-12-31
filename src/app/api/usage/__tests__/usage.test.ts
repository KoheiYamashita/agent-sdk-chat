import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

// Mock createServerTranslator
vi.mock('@/lib/i18n/server', () => ({
  createServerTranslator: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { GET } from '../route';
import fs from 'fs/promises';
import { createServerTranslator } from '@/lib/i18n/server';

const mockReadFile = fs.readFile as unknown as ReturnType<typeof vi.fn>;
const mockWriteFile = fs.writeFile as unknown as ReturnType<typeof vi.fn>;
const mockCreateServerTranslator = createServerTranslator as unknown as ReturnType<typeof vi.fn>;

const mockTranslator = (key: string) => `translated:${key}`;

describe('GET /api/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockCreateServerTranslator.mockResolvedValue(mockTranslator);
  });

  describe('credentials handling', () => {
    it('should return 401 when credentials file not found', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('credentials_not_found');
    });

    it('should return 401 when credentials have no OAuth token', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({}));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('credentials_not_found');
    });

    it('should return 401 when OAuth token is missing accessToken', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({
        claudeAiOauth: { refreshToken: 'refresh' },
      }));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('credentials_not_found');
    });
  });

  describe('token refresh', () => {
    const validCredentials = {
      claudeAiOauth: {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000, // Expired
        scopes: ['user'],
        subscriptionType: 'pro',
      },
    };

    it('should refresh expired token', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(validCredentials));
      mockWriteFile.mockResolvedValue(undefined);

      // Mock token refresh
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'new-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        })
        // Mock usage API call
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ usage: { tokens: 1000 } }),
        });

      const response = await GET();
      await response.json(); // Consume response body

      expect(response.status).toBe(200);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('should return 401 when token refresh fails', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(validCredentials));

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Invalid refresh token'),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('refresh_failed');
    });
  });

  describe('usage API', () => {
    const validCredentials = {
      claudeAiOauth: {
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000, // Not expired
        scopes: ['user'],
        subscriptionType: 'pro',
      },
    };

    it('should return usage data successfully', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(validCredentials));

      const usageData = { usage: { tokens: 5000, messages: 100 } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(usageData),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(usageData);
    });

    it('should return 401 when usage API returns 401', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(validCredentials));

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('unauthorized');
    });

    it('should return 500 when usage API fails', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(validCredentials));

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('api_error');
    });
  });

  describe('error handling', () => {
    it('should return 500 on unexpected error in fetch', async () => {
      const validCredentials = {
        claudeAiOauth: {
          accessToken: 'valid-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 3600000,
          scopes: ['user'],
          subscriptionType: 'pro',
        },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(validCredentials));
      mockFetch.mockRejectedValue(new Error('Network error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('internal_error');
    });
  });
});
