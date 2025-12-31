import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../create/route';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    access: vi.fn(),
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
import { prisma } from '@/lib/db/prisma';

const mockFs = fs as unknown as {
  mkdir: ReturnType<typeof vi.fn>;
  access: ReturnType<typeof vi.fn>;
};

const mockPrisma = prisma as unknown as {
  settings: { findUnique: ReturnType<typeof vi.fn> };
};

function createRequest(body: { parentPath?: string; name?: string }): Request {
  return new Request('http://localhost:3000/api/workspace/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/workspace/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.settings.findUnique.mockResolvedValue({
      key: 'sandbox',
      value: JSON.stringify({ workspacePath: '/tmp/test-workspace' }),
    });
    // By default, directory doesn't exist (access throws)
    mockFs.access.mockRejectedValue(new Error('ENOENT'));
    mockFs.mkdir.mockResolvedValue(undefined);
  });

  describe('validation', () => {
    it('should reject empty name', async () => {
      const request = createRequest({ parentPath: '.', name: '' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid directory name');
    });

    it('should reject name with forward slash', async () => {
      const request = createRequest({ parentPath: '.', name: 'foo/bar' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid directory name');
    });

    it('should reject name with backslash', async () => {
      const request = createRequest({ parentPath: '.', name: 'foo\\bar' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid directory name');
    });

    it('should reject hidden directory names', async () => {
      const request = createRequest({ parentPath: '.', name: '.hidden' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid directory name');
    });
  });

  describe('security', () => {
    it('should reject path traversal in parentPath', async () => {
      const request = createRequest({ parentPath: '../../../etc', name: 'test' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied: path outside workspace');
    });
  });

  describe('directory creation', () => {
    it('should create directory successfully', async () => {
      const request = createRequest({ parentPath: '.', name: 'new-folder' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.relativePath).toBe('new-folder');
    });

    it('should create nested directory', async () => {
      const request = createRequest({ parentPath: 'existing/path', name: 'nested' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 409 when directory already exists', async () => {
      mockFs.access.mockResolvedValue(undefined); // Directory exists

      const request = createRequest({ parentPath: '.', name: 'existing' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Directory already exists');
    });
  });

  describe('settings', () => {
    it('should use default workspace path when settings not found', async () => {
      mockPrisma.settings.findUnique.mockResolvedValue(null);

      const request = createRequest({ parentPath: '.', name: 'test' });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle invalid JSON in settings', async () => {
      mockPrisma.settings.findUnique.mockResolvedValue({
        key: 'sandbox',
        value: 'invalid json',
      });

      const request = createRequest({ parentPath: '.', name: 'test' });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('error handling', () => {
    it('should return 500 on filesystem error', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      const request = createRequest({ parentPath: '.', name: 'test' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create directory');
    });
  });
});
