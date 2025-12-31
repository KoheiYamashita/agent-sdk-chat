import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '../delete/route';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    rm: vi.fn(),
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
  rm: ReturnType<typeof vi.fn>;
};

const mockPrisma = prisma as unknown as {
  settings: { findUnique: ReturnType<typeof vi.fn> };
};

function createRequest(body: { path?: string; workspacePath?: string }): Request {
  return new Request('http://localhost:3000/api/workspace/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('DELETE /api/workspace/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.settings.findUnique.mockResolvedValue({
      key: 'sandbox',
      value: JSON.stringify({ workspacePath: '/tmp/test-workspace' }),
    });
    mockFs.access.mockResolvedValue(undefined);
    mockFs.rm.mockResolvedValue(undefined);
  });

  describe('validation', () => {
    it('should return 400 when path is missing', async () => {
      const request = createRequest({});
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Path is required');
    });

    it('should return 400 when path is empty', async () => {
      const request = createRequest({ path: '' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });
  });

  describe('security', () => {
    it('should reject path traversal attempts', async () => {
      const request = createRequest({ path: '../../../etc/passwd' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied: cannot delete this path');
    });

    it('should reject deleting the workspace root', async () => {
      const request = createRequest({ path: '.' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied: cannot delete this path');
    });
  });

  describe('deletion', () => {
    it('should delete file successfully', async () => {
      const request = createRequest({ path: 'file.txt' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.path).toBe('file.txt');
      expect(mockFs.rm).toHaveBeenCalledWith(
        expect.stringContaining('file.txt'),
        { recursive: true, force: true }
      );
    });

    it('should delete directory recursively', async () => {
      const request = createRequest({ path: 'folder/subfolder' });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      expect(mockFs.rm).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true, force: true }
      );
    });

    it('should return 404 when path not found', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const request = createRequest({ path: 'nonexistent' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('File or directory not found');
    });

    it('should use custom workspacePath when provided', async () => {
      const request = createRequest({
        path: 'file.txt',
        workspacePath: '/custom/workspace'
      });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
    });
  });

  describe('error handling', () => {
    it('should return 500 on filesystem error', async () => {
      mockFs.rm.mockRejectedValue(new Error('Permission denied'));

      const request = createRequest({ path: 'file.txt' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete');
    });
  });
});
