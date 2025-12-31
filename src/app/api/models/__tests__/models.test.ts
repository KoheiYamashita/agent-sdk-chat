import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    customModel: {
      findMany: vi.fn(),
    },
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { GET } from '../route';
import { prisma } from '@/lib/db/prisma';

const mockCustomModelFindMany = prisma.customModel.findMany as ReturnType<typeof vi.fn>;

describe('GET /api/models', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const mockStandardModels = [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Fast and capable' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable' },
  ];

  const mockCustomModels = [
    {
      id: 'custom-1',
      name: 'my-assistant',
      displayName: 'My Assistant',
      baseModel: 'claude-sonnet-4-20250514',
      systemPrompt: 'You are helpful',
      description: 'My custom model',
      icon: 'star',
      iconColor: '#ff0000',
      iconImageUrl: null,
      isEnabled: true,
      sortOrder: 0,
      skillSettings: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  it('should return both standard and custom models', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ models: mockStandardModels }),
    });
    mockCustomModelFindMany.mockResolvedValue(mockCustomModels);

    const response = await GET();

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.standardModels).toHaveLength(2);
    expect(json.customModels).toHaveLength(1);
    expect(json.customModels[0].name).toBe('my-assistant');
  });

  it('should only return enabled custom models', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ models: [] }),
    });
    mockCustomModelFindMany.mockResolvedValue([]);

    await GET();

    expect(mockCustomModelFindMany).toHaveBeenCalledWith({
      where: { isEnabled: true },
      orderBy: { sortOrder: 'asc' },
    });
  });

  it('should parse skillSettings JSON', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ models: [] }),
    });
    mockCustomModelFindMany.mockResolvedValue([
      {
        ...mockCustomModels[0],
        skillSettings: JSON.stringify({ 'skill-1': 'enabled' }),
      },
    ]);

    const response = await GET();
    const json = await response.json();

    expect(json.customModels[0].skillSettings).toEqual({ 'skill-1': 'enabled' });
  });

  it('should format dates as ISO strings', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ models: [] }),
    });
    mockCustomModelFindMany.mockResolvedValue(mockCustomModels);

    const response = await GET();
    const json = await response.json();

    expect(json.customModels[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(json.customModels[0].updatedAt).toBe('2024-01-02T00:00:00.000Z');
  });

  it('should return 500 on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const response = await GET();

    expect(response.status).toBe(500);
  });

  it('should return 500 on database error', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ models: [] }),
    });
    mockCustomModelFindMany.mockRejectedValue(new Error('DB error'));

    const response = await GET();

    expect(response.status).toBe(500);
  });
});
