import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../list/route';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    readdir: vi.fn(),
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
  readdir: ReturnType<typeof vi.fn>;
};

const mockPrisma = prisma as unknown as {
  settings: { findUnique: ReturnType<typeof vi.fn> };
};

function createRequest(params?: { path?: string; includeFiles?: string; workspacePath?: string }): Request {
  const searchParams = new URLSearchParams();
  if (params?.path) searchParams.set('path', params.path);
  if (params?.includeFiles) searchParams.set('includeFiles', params.includeFiles);
  if (params?.workspacePath) searchParams.set('workspacePath', params.workspacePath);
  const url = `http://localhost:3000/api/workspace/list?${searchParams.toString()}`;
  return new Request(url);
}

describe('GET /api/workspace/list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.settings.findUnique.mockResolvedValue({
      key: 'sandbox',
      value: JSON.stringify({ workspacePath: '/tmp/test-workspace' }),
    });
    mockFs.mkdir.mockResolvedValue(undefined);
  });

  it('should list directories in workspace', async () => {
    mockFs.readdir.mockResolvedValue([
      { name: 'folder1', isDirectory: () => true, isFile: () => false },
      { name: 'folder2', isDirectory: () => true, isFile: () => false },
    ]);

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(2);
    expect(data.items[0].name).toBe('folder1');
    expect(data.items[0].isDirectory).toBe(true);
  });

  it('should skip hidden files and directories', async () => {
    mockFs.readdir.mockResolvedValue([
      { name: '.hidden', isDirectory: () => true, isFile: () => false },
      { name: 'visible', isDirectory: () => true, isFile: () => false },
      { name: '.gitignore', isDirectory: () => false, isFile: () => true },
    ]);

    const request = createRequest({ includeFiles: 'true' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.items).toHaveLength(1);
    expect(data.items[0].name).toBe('visible');
  });

  it('should include files when includeFiles is true', async () => {
    mockFs.readdir.mockResolvedValue([
      { name: 'folder', isDirectory: () => true, isFile: () => false },
      { name: 'file.txt', isDirectory: () => false, isFile: () => true },
    ]);

    const request = createRequest({ includeFiles: 'true' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.items).toHaveLength(2);
    expect(data.items[0].name).toBe('folder');
    expect(data.items[0].isDirectory).toBe(true);
    expect(data.items[1].name).toBe('file.txt');
    expect(data.items[1].isDirectory).toBe(false);
  });

  it('should exclude files when includeFiles is not true', async () => {
    mockFs.readdir.mockResolvedValue([
      { name: 'folder', isDirectory: () => true, isFile: () => false },
      { name: 'file.txt', isDirectory: () => false, isFile: () => true },
    ]);

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.items).toHaveLength(1);
    expect(data.items[0].name).toBe('folder');
  });

  it('should reject path traversal attempts', async () => {
    const request = createRequest({ path: '../../../etc' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Access denied: path outside workspace');
  });

  it('should use default workspace path when settings not found', async () => {
    mockPrisma.settings.findUnique.mockResolvedValue(null);
    mockFs.readdir.mockResolvedValue([]);

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.basePath).toBe('./workspace');
  });

  it('should use workspacePath param when provided', async () => {
    mockFs.readdir.mockResolvedValue([]);

    const request = createRequest({ workspacePath: '/custom/path' });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.basePath).toBe('/custom/path');
  });

  it('should return currentPath in response', async () => {
    mockFs.readdir.mockResolvedValue([]);

    const request = createRequest({ path: 'subdir' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.currentPath).toBe('subdir');
  });

  it('should return 500 on filesystem error', async () => {
    mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to list directory');
  });

  it('should sort items alphabetically with directories first', async () => {
    mockFs.readdir.mockResolvedValue([
      { name: 'zebra', isDirectory: () => false, isFile: () => true },
      { name: 'alpha', isDirectory: () => true, isFile: () => false },
      { name: 'beta', isDirectory: () => false, isFile: () => true },
      { name: 'gamma', isDirectory: () => true, isFile: () => false },
    ]);

    const request = createRequest({ includeFiles: 'true' });
    const response = await GET(request);
    const data = await response.json();

    expect(data.items.map((i: { name: string }) => i.name)).toEqual([
      'alpha',
      'gamma',
      'beta',
      'zebra',
    ]);
  });
});
