import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../file/create/route';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
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
  access: ReturnType<typeof vi.fn>;
  mkdir: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
};

const mockPrisma = prisma as unknown as {
  settings: { findUnique: ReturnType<typeof vi.fn> };
};

function createRequest(body: {
  parentPath?: string;
  name?: string;
  isDirectory?: boolean;
  workspacePath?: string;
}): Request {
  return new Request('http://localhost:3000/api/workspace/file/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/workspace/file/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.settings.findUnique.mockResolvedValue({
      key: 'sandbox',
      value: JSON.stringify({ workspacePath: '/tmp/test-workspace' }),
    });
    // By default, file doesn't exist (access throws)
    mockFs.access.mockRejectedValue(new Error('ENOENT'));
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  describe('validation', () => {
    it('should return 400 when name is missing', async () => {
      const request = createRequest({ parentPath: '.' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name is required');
    });

    it('should reject name with forward slash', async () => {
      const request = createRequest({ parentPath: '.', name: 'path/file' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid name');
    });

    it('should reject name with backslash', async () => {
      const request = createRequest({ parentPath: '.', name: 'path\\file' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid name');
    });

    it('should reject name with double dots', async () => {
      const request = createRequest({ parentPath: '.', name: '..hidden' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid name');
    });
  });

  describe('security', () => {
    it('should reject path traversal in parentPath', async () => {
      const request = createRequest({ parentPath: '../../../etc', name: 'test.txt' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied: path outside workspace');
    });
  });

  describe('file creation', () => {
    it('should create file successfully', async () => {
      const request = createRequest({ parentPath: '.', name: 'newfile.txt', isDirectory: false });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.relativePath).toBe('newfile.txt');
      expect(data.isDirectory).toBe(false);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should create directory successfully', async () => {
      const request = createRequest({ parentPath: '.', name: 'newfolder', isDirectory: true });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isDirectory).toBe(true);
      expect(mockFs.mkdir).toHaveBeenCalled();
    });

    it('should create file in nested directory', async () => {
      const request = createRequest({ parentPath: 'folder/subfolder', name: 'test.txt', isDirectory: false });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.relativePath).toContain('test.txt');
    });

    it('should return 409 when file already exists', async () => {
      mockFs.access.mockResolvedValue(undefined); // File exists

      const request = createRequest({ parentPath: '.', name: 'existing.txt', isDirectory: false });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('File or directory already exists');
    });

    it('should use custom workspacePath when provided', async () => {
      const request = createRequest({
        parentPath: '.',
        name: 'test.txt',
        isDirectory: false,
        workspacePath: '/custom/workspace',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('settings', () => {
    it('should use default workspace path when settings not found', async () => {
      mockPrisma.settings.findUnique.mockResolvedValue(null);

      const request = createRequest({ parentPath: '.', name: 'test.txt' });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle invalid JSON in settings', async () => {
      mockPrisma.settings.findUnique.mockResolvedValue({
        key: 'sandbox',
        value: 'invalid json',
      });

      const request = createRequest({ parentPath: '.', name: 'test.txt' });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('error handling', () => {
    it('should return 500 on filesystem error', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      const request = createRequest({ parentPath: '.', name: 'test.txt', isDirectory: false });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create file/directory');
    });
  });
});
