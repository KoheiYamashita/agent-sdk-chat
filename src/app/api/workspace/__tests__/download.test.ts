import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    stat: vi.fn(),
    readFile: vi.fn(),
  },
}));

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

import { GET } from '../file/download/route';
import fs from 'fs/promises';
import { prisma } from '@/lib/db/prisma';
import mime from 'mime-types';

const mockStat = fs.stat as unknown as ReturnType<typeof vi.fn>;
const mockReadFile = fs.readFile as unknown as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.settings.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockLookup = mime.lookup as unknown as ReturnType<typeof vi.fn>;

function createRequest(queryParams: Record<string, string>): Request {
  const params = new URLSearchParams(queryParams);
  return new Request(`http://localhost:3000/api/workspace/file/download?${params}`, {
    method: 'GET',
  });
}

describe('GET /api/workspace/file/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFindUnique.mockResolvedValue({
      key: 'sandbox',
      value: JSON.stringify({ workspacePath: '/tmp/test-workspace' }),
    });
    mockLookup.mockReturnValue('text/plain');
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

  describe('successful download', () => {
    it('should download file with correct content-type', async () => {
      const fileContent = Buffer.from('Hello, World!');
      mockStat.mockResolvedValue({ isFile: () => true });
      mockReadFile.mockResolvedValue(fileContent);
      mockLookup.mockReturnValue('text/plain');

      const request = createRequest({ path: 'test.txt' });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
      expect(response.headers.get('Content-Length')).toBe('13');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('test.txt');
    });

    it('should use application/octet-stream for unknown types', async () => {
      const fileContent = Buffer.from('binary data');
      mockStat.mockResolvedValue({ isFile: () => true });
      mockReadFile.mockResolvedValue(fileContent);
      mockLookup.mockReturnValue(false);

      const request = createRequest({ path: 'unknown.xyz' });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
    });

    it('should use custom workspacePath when provided', async () => {
      const fileContent = Buffer.from('test');
      mockStat.mockResolvedValue({ isFile: () => true });
      mockReadFile.mockResolvedValue(fileContent);

      const request = createRequest({
        path: 'file.txt',
        workspacePath: '/custom/workspace',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('error handling', () => {
    it('should return 500 on unexpected error', async () => {
      mockFindUnique.mockRejectedValue(new Error('DB error'));
      const request = createRequest({ path: 'file.txt' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to download file');
    });
  });
});
