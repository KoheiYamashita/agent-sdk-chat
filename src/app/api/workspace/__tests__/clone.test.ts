import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock child_process - use hoisted mock
vi.mock('child_process', () => {
  const mockSpawnFn = vi.fn();
  return {
    spawn: mockSpawnFn,
    // For ESM compatibility
    default: { spawn: mockSpawnFn },
    __esModule: true,
  };
});

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
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

import { POST } from '../clone/route';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import { prisma } from '@/lib/db/prisma';

// Get references to mocked functions
const mockSpawnFn = spawn as unknown as ReturnType<typeof vi.fn>;
const mockAccess = fs.access as unknown as ReturnType<typeof vi.fn>;
const mockMkdir = fs.mkdir as unknown as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.settings.findUnique as unknown as ReturnType<typeof vi.fn>;

function createRequest(body: object): Request {
  return new Request('http://localhost:3000/api/workspace/clone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createMockProcess(exitCode: number, stderr = '') {
  const process = new EventEmitter() as EventEmitter & {
    stderr: EventEmitter;
  };
  process.stderr = new EventEmitter();

  setTimeout(() => {
    if (stderr) {
      process.stderr.emit('data', Buffer.from(stderr));
    }
    process.emit('close', exitCode);
  }, 0);

  return process;
}

describe('POST /api/workspace/clone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue({
      key: 'sandbox',
      value: JSON.stringify({ workspacePath: '/tmp/test-workspace' }),
    });
    mockAccess.mockRejectedValue(new Error('ENOENT')); // Folder doesn't exist
    mockMkdir.mockResolvedValue(undefined);
  });

  describe('validation', () => {
    it('should return 400 for missing repository URL', async () => {
      const response = await POST(createRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errorCode).toBe('INVALID_URL');
    });

    it('should return 400 for invalid URL format', async () => {
      const response = await POST(createRequest({ repositoryUrl: 'invalid-url' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errorCode).toBe('INVALID_URL');
    });

    it('should return 400 for URL with dangerous characters', async () => {
      const response = await POST(createRequest({
        repositoryUrl: 'https://github.com/user/repo;rm -rf /',
      }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errorCode).toBe('INVALID_URL');
    });

    it('should accept valid HTTPS URL', async () => {
      mockSpawnFn.mockReturnValue(createMockProcess(0));

      const response = await POST(createRequest({
        repositoryUrl: 'https://github.com/user/repo.git',
      }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should accept valid SSH URL', async () => {
      mockSpawnFn.mockReturnValue(createMockProcess(0));

      const response = await POST(createRequest({
        repositoryUrl: 'git@github.com:user/repo.git',
      }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('folder handling', () => {
    it('should return 409 when folder already exists', async () => {
      mockAccess.mockResolvedValue(undefined); // Folder exists

      const response = await POST(createRequest({
        repositoryUrl: 'https://github.com/user/repo.git',
      }));
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.errorCode).toBe('FOLDER_EXISTS');
    });

    it('should use custom target folder name', async () => {
      mockSpawnFn.mockReturnValue(createMockProcess(0));

      const response = await POST(createRequest({
        repositoryUrl: 'https://github.com/user/repo.git',
        targetFolderName: 'my-custom-folder',
      }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.repositoryName).toBe('my-custom-folder');
    });

    it('should sanitize folder name', async () => {
      mockSpawnFn.mockReturnValue(createMockProcess(0));

      const response = await POST(createRequest({
        repositoryUrl: 'https://github.com/user/repo.git',
        targetFolderName: 'folder:with*special?chars',
      }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.repositoryName).toBe('folder-with-special-chars');
    });
  });

  describe('clone execution', () => {
    it('should successfully clone repository', async () => {
      mockSpawnFn.mockReturnValue(createMockProcess(0));

      const response = await POST(createRequest({
        repositoryUrl: 'https://github.com/user/my-repo.git',
      }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.repositoryName).toBe('my-repo');
    });

    it('should handle authentication failure', async () => {
      mockSpawnFn.mockReturnValue(createMockProcess(128, 'Authentication failed'));

      const response = await POST(createRequest({
        repositoryUrl: 'https://github.com/user/private-repo.git',
      }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.errorCode).toBe('AUTHENTICATION_FAILED');
    });

    it('should handle repository not found', async () => {
      mockSpawnFn.mockReturnValue(createMockProcess(128, 'repository not found'));

      const response = await POST(createRequest({
        repositoryUrl: 'https://github.com/user/nonexistent.git',
      }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.errorCode).toBe('REPOSITORY_NOT_FOUND');
    });

    it('should handle clone failure', async () => {
      mockSpawnFn.mockReturnValue(createMockProcess(1, 'Some error'));

      const response = await POST(createRequest({
        repositoryUrl: 'https://github.com/user/repo.git',
      }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.errorCode).toBe('CLONE_FAILED');
    });
  });

  describe('error handling', () => {
    it('should return 500 on unexpected error', async () => {
      mockFindUnique.mockRejectedValue(new Error('DB error'));

      const response = await POST(createRequest({
        repositoryUrl: 'https://github.com/user/repo.git',
      }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.errorCode).toBe('CLONE_FAILED');
    });
  });
});
