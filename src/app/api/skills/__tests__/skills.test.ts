import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    skill: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

import { GET, POST } from '../route';
import { GET as GET_ID, PUT, DELETE } from '../[id]/route';
import { prisma } from '@/lib/db/prisma';

const mockFindMany = prisma.skill.findMany as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.skill.findUnique as ReturnType<typeof vi.fn>;
const mockFindFirst = (prisma.skill as unknown as { findFirst: ReturnType<typeof vi.fn> }).findFirst;
const mockCreate = prisma.skill.create as ReturnType<typeof vi.fn>;
const mockUpdate = (prisma.skill as unknown as { update: ReturnType<typeof vi.fn> }).update;
const mockDelete = (prisma.skill as unknown as { delete: ReturnType<typeof vi.fn> }).delete;
const mockAggregate = prisma.skill.aggregate as ReturnType<typeof vi.fn>;

describe('Skills API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const createRequest = (body: unknown) => {
    return new Request('http://localhost:3000/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  const mockSkill = {
    id: 'skill-1',
    name: 'code-review',
    displayName: 'Code Review',
    description: 'Reviews code',
    content: '---\nname: code-review\n---\nReview code',
    isEnabled: true,
    sortOrder: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  describe('GET /api/skills', () => {
    it('should return all skills', async () => {
      mockFindMany.mockResolvedValue([mockSkill]);

      const response = await GET();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.skills).toHaveLength(1);
      expect(json.skills[0].name).toBe('code-review');
    });

    it('should format dates as ISO strings', async () => {
      mockFindMany.mockResolvedValue([mockSkill]);

      const response = await GET();
      const json = await response.json();

      expect(json.skills[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(json.skills[0].updatedAt).toBe('2024-01-02T00:00:00.000Z');
    });

    it('should order by sortOrder', async () => {
      mockFindMany.mockResolvedValue([]);

      await GET();

      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should return 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'));

      const response = await GET();

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/skills', () => {
    it('should create a new skill', async () => {
      mockFindUnique.mockResolvedValue(null); // No duplicate
      mockAggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
      mockCreate.mockResolvedValue(mockSkill);

      const response = await POST(
        createRequest({
          name: 'Code Review',
          displayName: 'Code Review',
          content: '---\nname: code-review\n---',
        })
      );

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.name).toBe('code-review');
    });

    it('should sanitize name to be URL-safe', async () => {
      mockFindUnique.mockResolvedValue(null);
      mockAggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
      mockCreate.mockResolvedValue(mockSkill);

      await POST(
        createRequest({
          name: 'My Skill Name!@#',
          displayName: 'My Skill',
          content: 'content',
        })
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'my-skill-name',
        }),
      });
    });

    it('should return 400 when name is missing', async () => {
      const response = await POST(
        createRequest({
          displayName: 'Test',
          content: 'content',
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('required');
    });

    it('should return 400 when displayName is missing', async () => {
      const response = await POST(
        createRequest({
          name: 'test',
          content: 'content',
        })
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 when content is missing', async () => {
      const response = await POST(
        createRequest({
          name: 'test',
          displayName: 'Test',
        })
      );

      expect(response.status).toBe(400);
    });

    it('should return 409 when skill name already exists', async () => {
      mockFindUnique.mockResolvedValue(mockSkill);

      const response = await POST(
        createRequest({
          name: 'code-review',
          displayName: 'Another Code Review',
          content: 'content',
        })
      );

      expect(response.status).toBe(409);
      const json = await response.json();
      expect(json.error).toContain('already exists');
    });

    it('should set correct sort order for new skill', async () => {
      mockFindUnique.mockResolvedValue(null);
      mockAggregate.mockResolvedValue({ _max: { sortOrder: 5 } });
      mockCreate.mockResolvedValue({ ...mockSkill, sortOrder: 6 });

      await POST(
        createRequest({
          name: 'new-skill',
          displayName: 'New Skill',
          content: 'content',
        })
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sortOrder: 6,
        }),
      });
    });

    it('should return 500 on database error', async () => {
      mockFindUnique.mockRejectedValue(new Error('DB error'));

      const response = await POST(
        createRequest({
          name: 'test',
          displayName: 'Test',
          content: 'content',
        })
      );

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/skills/[id]', () => {
    const createRouteParams = (id: string) => ({ params: Promise.resolve({ id }) });

    it('should return skill by id', async () => {
      mockFindUnique.mockResolvedValue(mockSkill);

      const response = await GET_ID(
        new Request('http://localhost:3000/api/skills/skill-1'),
        createRouteParams('skill-1')
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.id).toBe('skill-1');
      expect(json.name).toBe('code-review');
    });

    it('should return 404 when skill not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const response = await GET_ID(
        new Request('http://localhost:3000/api/skills/non-existent'),
        createRouteParams('non-existent')
      );

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe('Skill not found');
    });

    it('should return 500 on database error', async () => {
      mockFindUnique.mockRejectedValue(new Error('DB error'));

      const response = await GET_ID(
        new Request('http://localhost:3000/api/skills/skill-1'),
        createRouteParams('skill-1')
      );

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/skills/[id]', () => {
    const createRouteParams = (id: string) => ({ params: Promise.resolve({ id }) });
    const createPutRequest = (body: unknown) => {
      return new Request('http://localhost:3000/api/skills/skill-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    };

    it('should update skill displayName', async () => {
      mockFindUnique.mockResolvedValue(mockSkill);
      mockUpdate.mockResolvedValue({ ...mockSkill, displayName: 'Updated Skill' });

      const response = await PUT(
        createPutRequest({ displayName: 'Updated Skill' }),
        createRouteParams('skill-1')
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.displayName).toBe('Updated Skill');
    });

    it('should update skill isEnabled', async () => {
      mockFindUnique.mockResolvedValue(mockSkill);
      mockUpdate.mockResolvedValue({ ...mockSkill, isEnabled: false });

      const response = await PUT(
        createPutRequest({ isEnabled: false }),
        createRouteParams('skill-1')
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.isEnabled).toBe(false);
    });

    it('should sanitize name when updating', async () => {
      mockFindUnique.mockResolvedValue(mockSkill);
      mockFindFirst.mockResolvedValue(null);
      mockUpdate.mockResolvedValue({ ...mockSkill, name: 'new-name' });

      await PUT(
        createPutRequest({ name: 'New Name!@#' }),
        createRouteParams('skill-1')
      );

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'skill-1' },
        data: expect.objectContaining({ name: 'new-name' }),
      });
    });

    it('should return 404 when skill not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const response = await PUT(
        createPutRequest({ displayName: 'Updated' }),
        createRouteParams('non-existent')
      );

      expect(response.status).toBe(404);
    });

    it('should return 409 when new name already exists', async () => {
      mockFindUnique.mockResolvedValue(mockSkill);
      mockFindFirst.mockResolvedValue({ id: 'skill-2', name: 'other-skill' });

      const response = await PUT(
        createPutRequest({ name: 'other-skill' }),
        createRouteParams('skill-1')
      );

      expect(response.status).toBe(409);
    });

    it('should return 500 on database error', async () => {
      mockFindUnique.mockResolvedValue(mockSkill);
      mockUpdate.mockRejectedValue(new Error('DB error'));

      const response = await PUT(
        createPutRequest({ displayName: 'Updated' }),
        createRouteParams('skill-1')
      );

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/skills/[id]', () => {
    const createRouteParams = (id: string) => ({ params: Promise.resolve({ id }) });

    it('should delete skill', async () => {
      mockFindUnique.mockResolvedValue(mockSkill);
      mockDelete.mockResolvedValue(mockSkill);

      const response = await DELETE(
        new Request('http://localhost:3000/api/skills/skill-1', { method: 'DELETE' }),
        createRouteParams('skill-1')
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });

    it('should return 404 when skill not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const response = await DELETE(
        new Request('http://localhost:3000/api/skills/non-existent', { method: 'DELETE' }),
        createRouteParams('non-existent')
      );

      expect(response.status).toBe(404);
    });

    it('should return 500 on database error', async () => {
      mockFindUnique.mockResolvedValue(mockSkill);
      mockDelete.mockRejectedValue(new Error('DB error'));

      const response = await DELETE(
        new Request('http://localhost:3000/api/skills/skill-1', { method: 'DELETE' }),
        createRouteParams('skill-1')
      );

      expect(response.status).toBe(500);
    });
  });
});
