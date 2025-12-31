import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../rename/route';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    rename: vi.fn(),
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
  rename: ReturnType<typeof vi.fn>;
};

const mockPrisma = prisma as unknown as {
  settings: { findUnique: ReturnType<typeof vi.fn> };
};

function createRequest(body: { oldPath?: string; newName?: string; workspacePath?: string }): Request {
  return new Request('http://localhost:3000/api/workspace/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/workspace/rename', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.settings.findUnique.mockResolvedValue({
      key: 'sandbox',
      value: JSON.stringify({ workspacePath: '/tmp/test-workspace' }),
    });
    mockFs.rename.mockResolvedValue(undefined);
  });

  // Helper to set up access mock for rename tests
  function setupAccessMock(options: { oldExists: boolean; newExists: boolean }) {
    let callCount = 0;
    mockFs.access.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // First call: check if old path exists
        if (!options.oldExists) throw new Error('ENOENT');
        return undefined;
      }
      // Second call: check if new path exists
      if (options.newExists) return undefined;
      throw new Error('ENOENT');
    });
  }

  describe('validation', () => {
    it('should return 400 when oldPath is missing', async () => {
      const request = createRequest({ newName: 'newname' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Old path and new name are required');
    });

    it('should return 400 when newName is missing', async () => {
      const request = createRequest({ oldPath: 'old.txt' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Old path and new name are required');
    });

    it('should reject newName with forward slash', async () => {
      const request = createRequest({ oldPath: 'old.txt', newName: 'path/name' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid name');
    });

    it('should reject newName with backslash', async () => {
      const request = createRequest({ oldPath: 'old.txt', newName: 'path\\name' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid name');
    });

    it('should reject newName with double dots', async () => {
      const request = createRequest({ oldPath: 'old.txt', newName: '..hidden' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid name');
    });
  });

  describe('security', () => {
    it('should reject path traversal in oldPath', async () => {
      const request = createRequest({ oldPath: '../../../etc/passwd', newName: 'newname' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied: path outside workspace');
    });
  });

  describe('renaming', () => {
    it('should rename file successfully', async () => {
      setupAccessMock({ oldExists: true, newExists: false });

      const request = createRequest({ oldPath: 'old.txt', newName: 'new.txt' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.oldPath).toBe('old.txt');
      expect(data.newPath).toBe('new.txt');
    });

    it('should rename file in subdirectory', async () => {
      setupAccessMock({ oldExists: true, newExists: false });

      const request = createRequest({ oldPath: 'folder/old.txt', newName: 'new.txt' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.newPath).toBe('folder/new.txt');
    });

    it('should return 404 when old path not found', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const request = createRequest({ oldPath: 'nonexistent.txt', newName: 'new.txt' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('File or directory not found');
    });

    it('should return 409 when new name already exists', async () => {
      // Both paths exist
      mockFs.access.mockResolvedValue(undefined);

      const request = createRequest({ oldPath: 'old.txt', newName: 'existing.txt' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('A file or directory with that name already exists');
    });

    it('should use custom workspacePath when provided', async () => {
      setupAccessMock({ oldExists: true, newExists: false });

      const request = createRequest({
        oldPath: 'old.txt',
        newName: 'new.txt',
        workspacePath: '/custom/workspace',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('error handling', () => {
    it('should return 500 on filesystem error', async () => {
      // Old path exists, new path doesn't exist
      let accessCallCount = 0;
      mockFs.access.mockImplementation(async () => {
        accessCallCount++;
        if (accessCallCount === 1) {
          // First call: old path exists
          return undefined;
        }
        // Second call: new path doesn't exist
        throw new Error('ENOENT');
      });
      mockFs.rename.mockRejectedValue(new Error('Permission denied'));

      const request = createRequest({ oldPath: 'old.txt', newName: 'new.txt' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to rename');
    });
  });
});
