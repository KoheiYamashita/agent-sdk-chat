import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from '../file/route';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    stat: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

// Mock mime-types
vi.mock('mime-types', () => ({
  default: {
    lookup: vi.fn(),
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

import fs from 'fs/promises';
import mime from 'mime-types';
import { prisma } from '@/lib/db/prisma';

const mockFs = fs as unknown as {
  stat: ReturnType<typeof vi.fn>;
  readFile: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
};

const mockMime = mime as unknown as {
  lookup: ReturnType<typeof vi.fn>;
};

const mockPrisma = prisma as unknown as {
  settings: { findUnique: ReturnType<typeof vi.fn> };
};

function createGetRequest(params: { path?: string; workspacePath?: string }): Request {
  const searchParams = new URLSearchParams();
  if (params.path) searchParams.set('path', params.path);
  if (params.workspacePath) searchParams.set('workspacePath', params.workspacePath);
  return new Request(`http://localhost:3000/api/workspace/file?${searchParams.toString()}`);
}

function createPutRequest(body: { path?: string; content?: string; encoding?: string; workspacePath?: string }): Request {
  return new Request('http://localhost:3000/api/workspace/file', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/workspace/file', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.settings.findUnique.mockResolvedValue({
      key: 'sandbox',
      value: JSON.stringify({ workspacePath: '/tmp/test-workspace' }),
    });
    mockFs.stat.mockResolvedValue({ isFile: () => true, size: 100 });
    mockFs.readFile.mockResolvedValue('file content');
    mockMime.lookup.mockReturnValue('text/plain');
  });

  describe('validation', () => {
    it('should return 400 when path is missing', async () => {
      const request = createGetRequest({});
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Path parameter is required');
    });
  });

  describe('security', () => {
    it('should reject path traversal', async () => {
      const request = createGetRequest({ path: '../../../etc/passwd' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied: path outside workspace');
    });
  });

  describe('file reading', () => {
    it('should read text file', async () => {
      mockMime.lookup.mockReturnValue('text/plain');
      mockFs.readFile.mockResolvedValue('Hello, World!');

      const request = createGetRequest({ path: 'test.txt' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBe('Hello, World!');
      expect(data.encoding).toBe('utf-8');
      expect(data.mimeType).toBe('text/plain');
    });

    it('should read binary file as base64', async () => {
      mockMime.lookup.mockReturnValue('image/png');
      mockFs.readFile.mockResolvedValue(Buffer.from('fake image data'));

      const request = createGetRequest({ path: 'image.png' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.encoding).toBe('base64');
    });

    it('should read JSON file as text', async () => {
      mockMime.lookup.mockReturnValue('application/json');
      mockFs.readFile.mockResolvedValue('{"key": "value"}');

      const request = createGetRequest({ path: 'data.json' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.encoding).toBe('utf-8');
    });

    it('should return 404 when file not found', async () => {
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));

      const request = createGetRequest({ path: 'nonexistent.txt' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('File not found');
    });

    it('should return 400 when path is a directory', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => false, size: 0 });

      const request = createGetRequest({ path: 'folder' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Path is not a file');
    });

    it('should include file size in response', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => true, size: 1234 });

      const request = createGetRequest({ path: 'test.txt' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.size).toBe(1234);
    });
  });

  describe('error handling', () => {
    it('should return 500 on read error', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Read error'));

      const request = createGetRequest({ path: 'test.txt' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to read file');
    });
  });
});

describe('PUT /api/workspace/file', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.settings.findUnique.mockResolvedValue({
      key: 'sandbox',
      value: JSON.stringify({ workspacePath: '/tmp/test-workspace' }),
    });
    mockFs.stat.mockResolvedValue({ isFile: () => true });
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  describe('validation', () => {
    it('should return 400 when path is missing', async () => {
      const request = createPutRequest({ content: 'test' });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Path is required');
    });
  });

  describe('security', () => {
    it('should reject path traversal', async () => {
      const request = createPutRequest({ path: '../../../etc/passwd', content: 'hack' });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied: path outside workspace');
    });
  });

  describe('file writing', () => {
    it('should write text file', async () => {
      const request = createPutRequest({ path: 'test.txt', content: 'New content' });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test.txt'),
        'New content',
        'utf-8'
      );
    });

    it('should write base64 encoded binary file', async () => {
      const base64Content = Buffer.from('binary data').toString('base64');
      const request = createPutRequest({
        path: 'image.png',
        content: base64Content,
        encoding: 'base64',
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('image.png'),
        expect.any(Buffer)
      );
    });

    it('should return 404 when file not found', async () => {
      mockFs.stat.mockRejectedValue(new Error('ENOENT'));

      const request = createPutRequest({ path: 'nonexistent.txt', content: 'test' });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('File not found');
    });

    it('should return 400 when path is a directory', async () => {
      mockFs.stat.mockResolvedValue({ isFile: () => false });

      const request = createPutRequest({ path: 'folder', content: 'test' });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Path is not a file');
    });
  });

  describe('error handling', () => {
    it('should return 500 on write error', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write error'));

      const request = createPutRequest({ path: 'test.txt', content: 'test' });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to save file');
    });
  });
});
