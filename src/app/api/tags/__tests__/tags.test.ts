import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    tag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/i18n/server', () => ({
  createServerTranslator: vi.fn(() =>
    Promise.resolve((key: string) => `translated:${key}`)
  ),
}));

import { GET, POST } from '../route';
import { PATCH, DELETE } from '../[id]/route';
import { prisma } from '@/lib/db/prisma';

const mockFindMany = prisma.tag.findMany as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.tag.findUnique as ReturnType<typeof vi.fn>;
const mockFindFirst = (prisma.tag as unknown as { findFirst: ReturnType<typeof vi.fn> }).findFirst;
const mockCreate = prisma.tag.create as ReturnType<typeof vi.fn>;
const mockUpdate = (prisma.tag as unknown as { update: ReturnType<typeof vi.fn> }).update;
const mockDelete = (prisma.tag as unknown as { delete: ReturnType<typeof vi.fn> }).delete;

describe('Tags API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const createRequest = (body: unknown) => {
    return new Request('http://localhost:3000/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  const mockTag = {
    id: 'tag-1',
    name: 'Work',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    _count: { sessions: 5 },
  };

  describe('GET /api/tags', () => {
    it('should return all tags with session counts', async () => {
      mockFindMany.mockResolvedValue([mockTag]);

      const response = await GET();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.tags).toHaveLength(1);
      expect(json.tags[0].name).toBe('Work');
      expect(json.tags[0].sessionCount).toBe(5);
    });

    it('should format dates as ISO strings', async () => {
      mockFindMany.mockResolvedValue([mockTag]);

      const response = await GET();
      const json = await response.json();

      expect(json.tags[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should order by name ascending', async () => {
      mockFindMany.mockResolvedValue([]);

      await GET();

      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { sessions: true },
          },
        },
      });
    });

    it('should return 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'));

      const response = await GET();

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/tags', () => {
    it('should create a new tag', async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: 'new-tag',
        name: 'Personal',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      const response = await POST(createRequest({ name: 'Personal' }));

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.name).toBe('Personal');
      expect(json.sessionCount).toBe(0);
    });

    it('should trim whitespace from name', async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: 'new-tag',
        name: 'Trimmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await POST(createRequest({ name: '  Trimmed  ' }));

      expect(mockCreate).toHaveBeenCalledWith({
        data: { name: 'Trimmed' },
      });
    });

    it('should return 400 when name is missing', async () => {
      const response = await POST(createRequest({}));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('translated:nameRequired');
    });

    it('should return 400 when name is empty string', async () => {
      const response = await POST(createRequest({ name: '' }));

      expect(response.status).toBe(400);
    });

    it('should return 400 when name is whitespace only', async () => {
      const response = await POST(createRequest({ name: '   ' }));

      expect(response.status).toBe(400);
    });

    it('should return 409 when tag name already exists', async () => {
      mockFindUnique.mockResolvedValue(mockTag);

      const response = await POST(createRequest({ name: 'Work' }));

      expect(response.status).toBe(409);
      const json = await response.json();
      expect(json.error).toContain('translated:alreadyExists');
    });

    it('should return 500 on database error', async () => {
      mockFindUnique.mockRejectedValue(new Error('DB error'));

      const response = await POST(createRequest({ name: 'Test' }));

      expect(response.status).toBe(500);
    });
  });

  describe('PATCH /api/tags/[id]', () => {
    const createPatchRequest = (body: unknown) => {
      return new Request('http://localhost:3000/api/tags/tag-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    };

    const createRouteParams = (id: string) => ({ params: Promise.resolve({ id }) });

    it('should update tag name', async () => {
      mockFindUnique.mockResolvedValue({ id: 'tag-1', name: 'Old Name' });
      mockFindFirst.mockResolvedValue(null);
      mockUpdate.mockResolvedValue({
        id: 'tag-1',
        name: 'New Name',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        _count: { sessions: 5 },
      });

      const response = await PATCH(createPatchRequest({ name: 'New Name' }), createRouteParams('tag-1'));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.name).toBe('New Name');
      expect(json.sessionCount).toBe(5);
    });

    it('should return 404 when tag not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const response = await PATCH(createPatchRequest({ name: 'New Name' }), createRouteParams('non-existent'));

      expect(response.status).toBe(404);
    });

    it('should return 400 when new name is empty', async () => {
      mockFindUnique.mockResolvedValue({ id: 'tag-1', name: 'Old Name' });

      const response = await PATCH(createPatchRequest({ name: '  ' }), createRouteParams('tag-1'));

      expect(response.status).toBe(400);
    });

    it('should return 409 when new name already exists', async () => {
      mockFindUnique.mockResolvedValue({ id: 'tag-1', name: 'Tag 1' });
      mockFindFirst.mockResolvedValue({ id: 'tag-2', name: 'Tag 2' });

      const response = await PATCH(createPatchRequest({ name: 'Tag 2' }), createRouteParams('tag-1'));

      expect(response.status).toBe(409);
    });

    it('should return 500 on database error', async () => {
      mockFindUnique.mockResolvedValue({ id: 'tag-1', name: 'Old Name' });
      mockFindFirst.mockResolvedValue(null);
      mockUpdate.mockRejectedValue(new Error('DB error'));

      const response = await PATCH(createPatchRequest({ name: 'New Name' }), createRouteParams('tag-1'));

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/tags/[id]', () => {
    const createDeleteRequest = () => {
      return new Request('http://localhost:3000/api/tags/tag-1', { method: 'DELETE' });
    };

    const createRouteParams = (id: string) => ({ params: Promise.resolve({ id }) });

    it('should delete tag when no sessions associated', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'tag-1',
        name: 'Tag 1',
        _count: { sessions: 0 },
      });
      mockDelete.mockResolvedValue({ id: 'tag-1' });

      const response = await DELETE(createDeleteRequest(), createRouteParams('tag-1'));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });

    it('should return 404 when tag not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const response = await DELETE(createDeleteRequest(), createRouteParams('non-existent'));

      expect(response.status).toBe(404);
    });

    it('should return 409 when tag has associated sessions', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'tag-1',
        name: 'Tag 1',
        _count: { sessions: 5 },
      });

      const response = await DELETE(createDeleteRequest(), createRouteParams('tag-1'));

      expect(response.status).toBe(409);
    });

    it('should return 500 on database error', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'tag-1',
        name: 'Tag 1',
        _count: { sessions: 0 },
      });
      mockDelete.mockRejectedValue(new Error('DB error'));

      const response = await DELETE(createDeleteRequest(), createRouteParams('tag-1'));

      expect(response.status).toBe(500);
    });
  });
});
