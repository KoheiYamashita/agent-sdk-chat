import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { GET as GET_BY_ID, PUT, DELETE } from '../[id]/route';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    customModel: {
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

import { prisma } from '@/lib/db/prisma';

const mockPrisma = prisma as unknown as {
  customModel: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
};

function createRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/models/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

const mockDbModel = {
  id: 'model-1',
  name: 'test-model',
  displayName: 'Test Model',
  baseModel: 'claude-sonnet-4-20250514',
  systemPrompt: 'You are a helpful assistant.',
  description: 'A test model',
  icon: 'Sparkles',
  iconColor: '#ff0000',
  iconImageUrl: null,
  skillSettings: JSON.stringify({ enabled: ['skill1'] }),
  isEnabled: true,
  sortOrder: 1,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
};

describe('GET /api/models/custom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return list of custom models', async () => {
    mockPrisma.customModel.findMany.mockResolvedValue([mockDbModel]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.models).toHaveLength(1);
    expect(data.models[0]).toMatchObject({
      id: 'model-1',
      name: 'test-model',
      displayName: 'Test Model',
      baseModel: 'claude-sonnet-4-20250514',
      isEnabled: true,
    });
  });

  it('should parse skillSettings JSON', async () => {
    mockPrisma.customModel.findMany.mockResolvedValue([mockDbModel]);

    const response = await GET();
    const data = await response.json();

    expect(data.models[0].skillSettings).toEqual({ enabled: ['skill1'] });
  });

  it('should handle null skillSettings', async () => {
    mockPrisma.customModel.findMany.mockResolvedValue([
      { ...mockDbModel, skillSettings: null },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(data.models[0].skillSettings).toBeNull();
  });

  it('should return empty array when no models exist', async () => {
    mockPrisma.customModel.findMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(data.models).toEqual([]);
  });

  it('should return 500 on database error', async () => {
    mockPrisma.customModel.findMany.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch custom models');
  });
});

describe('POST /api/models/custom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.customModel.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
  });

  it('should create a new custom model', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(null);
    mockPrisma.customModel.create.mockResolvedValue(mockDbModel);

    const request = createRequest({
      name: 'Test Model',
      displayName: 'Test Model',
      baseModel: 'claude-sonnet-4-20250514',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.displayName).toBe('Test Model');
  });

  it('should sanitize model name', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(null);
    mockPrisma.customModel.create.mockResolvedValue({
      ...mockDbModel,
      name: 'my-test-model',
    });

    const request = createRequest({
      name: 'My Test Model!!!',
      displayName: 'My Test Model',
      baseModel: 'claude-sonnet-4-20250514',
    });

    await POST(request);

    expect(mockPrisma.customModel.findUnique).toHaveBeenCalledWith({
      where: { name: 'my-test-model' },
    });
  });

  it('should return 400 when required fields are missing', async () => {
    const request = createRequest({
      name: 'Test',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('name, displayName, and baseModel are required');
  });

  it('should return 409 when model name already exists', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(mockDbModel);

    const request = createRequest({
      name: 'test-model',
      displayName: 'Test Model',
      baseModel: 'claude-sonnet-4-20250514',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('A model with this name already exists');
  });

  it('should set sortOrder based on existing models', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(null);
    mockPrisma.customModel.aggregate.mockResolvedValue({ _max: { sortOrder: 5 } });
    mockPrisma.customModel.create.mockResolvedValue({
      ...mockDbModel,
      sortOrder: 6,
    });

    const request = createRequest({
      name: 'New Model',
      displayName: 'New Model',
      baseModel: 'claude-sonnet-4-20250514',
    });

    await POST(request);

    expect(mockPrisma.customModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sortOrder: 6 }),
      })
    );
  });

  it('should handle optional fields', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(null);
    mockPrisma.customModel.create.mockResolvedValue({
      ...mockDbModel,
      systemPrompt: 'Custom prompt',
      description: 'Custom description',
      skillSettings: JSON.stringify({ enabled: ['s1'] }),
    });

    const request = createRequest({
      name: 'New Model',
      displayName: 'New Model',
      baseModel: 'claude-sonnet-4-20250514',
      systemPrompt: 'Custom prompt',
      description: 'Custom description',
      skillSettings: { enabled: ['s1'] },
    });

    await POST(request);

    expect(mockPrisma.customModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          systemPrompt: 'Custom prompt',
          description: 'Custom description',
          skillSettings: JSON.stringify({ enabled: ['s1'] }),
        }),
      })
    );
  });
});

describe('GET /api/models/custom/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a single custom model', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(mockDbModel);

    const response = await GET_BY_ID(
      new Request('http://localhost:3000/api/models/custom/model-1'),
      createParams('model-1')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('model-1');
    expect(data.displayName).toBe('Test Model');
  });

  it('should return 404 when model not found', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(null);

    const response = await GET_BY_ID(
      new Request('http://localhost:3000/api/models/custom/nonexistent'),
      createParams('nonexistent')
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Model not found');
  });
});

describe('PUT /api/models/custom/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update a custom model', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(mockDbModel);
    mockPrisma.customModel.update.mockResolvedValue({
      ...mockDbModel,
      displayName: 'Updated Name',
    });

    const request = new Request('http://localhost:3000/api/models/custom/model-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Updated Name' }),
    });

    const response = await PUT(request, createParams('model-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.displayName).toBe('Updated Name');
  });

  it('should return 404 when model not found', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/models/custom/nonexistent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Updated Name' }),
    });

    const response = await PUT(request, createParams('nonexistent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Model not found');
  });

  it('should check for duplicate name when changing name', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(mockDbModel);
    mockPrisma.customModel.findFirst.mockResolvedValue({ id: 'other-model' });

    const request = new Request('http://localhost:3000/api/models/custom/model-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'existing-name' }),
    });

    const response = await PUT(request, createParams('model-1'));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('A model with this name already exists');
  });

  it('should allow updating to same name', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(mockDbModel);
    mockPrisma.customModel.update.mockResolvedValue(mockDbModel);

    const request = new Request('http://localhost:3000/api/models/custom/model-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-model' }),
    });

    const response = await PUT(request, createParams('model-1'));

    expect(response.status).toBe(200);
    // Should not check for duplicates when name is the same
    expect(mockPrisma.customModel.findFirst).not.toHaveBeenCalled();
  });

  it('should update skillSettings', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(mockDbModel);
    mockPrisma.customModel.update.mockResolvedValue({
      ...mockDbModel,
      skillSettings: JSON.stringify({ enabled: ['new-skill'] }),
    });

    const request = new Request('http://localhost:3000/api/models/custom/model-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillSettings: { enabled: ['new-skill'] } }),
    });

    await PUT(request, createParams('model-1'));

    expect(mockPrisma.customModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          skillSettings: JSON.stringify({ enabled: ['new-skill'] }),
        }),
      })
    );
  });

  it('should allow clearing skillSettings', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(mockDbModel);
    mockPrisma.customModel.update.mockResolvedValue({
      ...mockDbModel,
      skillSettings: null,
    });

    const request = new Request('http://localhost:3000/api/models/custom/model-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillSettings: null }),
    });

    await PUT(request, createParams('model-1'));

    expect(mockPrisma.customModel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          skillSettings: null,
        }),
      })
    );
  });
});

describe('DELETE /api/models/custom/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete a custom model', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(mockDbModel);
    mockPrisma.customModel.delete.mockResolvedValue(mockDbModel);

    const response = await DELETE(
      new Request('http://localhost:3000/api/models/custom/model-1', { method: 'DELETE' }),
      createParams('model-1')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should return 404 when model not found', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(null);

    const response = await DELETE(
      new Request('http://localhost:3000/api/models/custom/nonexistent', { method: 'DELETE' }),
      createParams('nonexistent')
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Model not found');
  });

  it('should return 500 on database error', async () => {
    mockPrisma.customModel.findUnique.mockResolvedValue(mockDbModel);
    mockPrisma.customModel.delete.mockRejectedValue(new Error('DB error'));

    const response = await DELETE(
      new Request('http://localhost:3000/api/models/custom/model-1', { method: 'DELETE' }),
      createParams('model-1')
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete custom model');
  });
});
