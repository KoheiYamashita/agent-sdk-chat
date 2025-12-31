import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    stat: vi.fn(),
  },
}));

// Mock fs (createReadStream) - need to include default for ESM compatibility
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    createReadStream: vi.fn(),
    default: {
      ...actual,
      createReadStream: vi.fn(),
    },
  };
});

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    settings: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock mime-types
vi.mock('mime-types', () => ({
  default: {
    lookup: vi.fn(),
  },
}));

import { GET } from '../file/stream/route';
import fs from 'fs/promises';
import { prisma } from '@/lib/db/prisma';

const mockStat = fs.stat as unknown as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.settings.findUnique as unknown as ReturnType<typeof vi.fn>;

function createRequest(queryParams: Record<string, string>): Request {
  const params = new URLSearchParams(queryParams);
  return new Request(`http://localhost:3000/api/workspace/file/stream?${params}`, {
    method: 'GET',
  });
}

describe('GET /api/workspace/file/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFindUnique.mockResolvedValue({
      key: 'sandbox',
      value: JSON.stringify({ workspacePath: '/tmp/test-workspace' }),
    });
  });

  describe('validation', () => {
    it('should return 400 when path is missing', async () => {
      const request = createRequest({});

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Path parameter is required');
    });

    it('should return 403 for path traversal attempt', async () => {
      const request = createRequest({ path: '../../../etc/passwd' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('outside workspace');
    });
  });

  describe('file existence', () => {
    it('should return 404 when file not found', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT'));
      const request = createRequest({ path: 'nonexistent.txt' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('File not found');
    });

    it('should return 400 when path is a directory', async () => {
      mockStat.mockResolvedValue({ isFile: () => false });
      const request = createRequest({ path: 'some-directory' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Path is not a file');
    });
  });

  // Note: Actual streaming tests are skipped because they require complex
  // Node.js stream mocking that is difficult to set up in jsdom environment.
  // The streaming functionality is tested indirectly through integration tests.

  describe('error handling', () => {
    it('should return 500 on unexpected error', async () => {
      mockFindUnique.mockRejectedValue(new Error('DB error'));
      const request = createRequest({ path: 'file.txt' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to stream file');
    });
  });
});
