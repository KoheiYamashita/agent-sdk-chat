import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    session: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock i18n
vi.mock('@/lib/i18n/server', () => ({
  createServerTranslator: vi.fn(() =>
    Promise.resolve((key: string) => (key === 'newChat' ? 'New Chat' : key))
  ),
}));

import { prisma } from '@/lib/db/prisma';

const mockPrisma = prisma as unknown as {
  session: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

function createRequest(params?: { cursor?: string; limit?: string }): NextRequest {
  const searchParams = new URLSearchParams();
  if (params?.cursor) searchParams.set('cursor', params.cursor);
  if (params?.limit) searchParams.set('limit', params.limit);
  const url = `http://localhost:3000/api/sessions?${searchParams.toString()}`;
  return new NextRequest(url);
}

const mockSession = {
  id: 'session-1',
  title: 'Test Session',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
  isArchived: false,
  _count: { messages: 5 },
  tag: { id: 'tag-1', name: 'Work' },
};

describe('GET /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return list of sessions', async () => {
    mockPrisma.session.count.mockResolvedValue(1);
    mockPrisma.session.findMany.mockResolvedValue([mockSession]);

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0]).toMatchObject({
      id: 'session-1',
      title: 'Test Session',
      messageCount: 5,
      tagId: 'tag-1',
      tagName: 'Work',
    });
  });

  it('should return total count', async () => {
    mockPrisma.session.count.mockResolvedValue(42);
    mockPrisma.session.findMany.mockResolvedValue([mockSession]);

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.total).toBe(42);
  });

  it('should handle session without tag', async () => {
    mockPrisma.session.count.mockResolvedValue(1);
    mockPrisma.session.findMany.mockResolvedValue([{ ...mockSession, tag: null }]);

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.sessions[0].tagId).toBeNull();
    expect(data.sessions[0].tagName).toBeNull();
  });

  describe('pagination', () => {
    it('should indicate hasMore when more results exist', async () => {
      mockPrisma.session.count.mockResolvedValue(25);
      // Return 21 items (limit + 1) to indicate more exist
      const sessions = Array(21)
        .fill(null)
        .map((_, i) => ({
          ...mockSession,
          id: `session-${i}`,
        }));
      mockPrisma.session.findMany.mockResolvedValue(sessions);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.hasMore).toBe(true);
      expect(data.sessions).toHaveLength(20); // Should exclude extra item
      expect(data.nextCursor).toBe('session-19');
    });

    it('should indicate no more results', async () => {
      mockPrisma.session.count.mockResolvedValue(5);
      mockPrisma.session.findMany.mockResolvedValue([mockSession]);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.hasMore).toBe(false);
      expect(data.nextCursor).toBeNull();
    });

    it('should use cursor for pagination', async () => {
      mockPrisma.session.count.mockResolvedValue(10);
      mockPrisma.session.findMany.mockResolvedValue([mockSession]);

      const request = createRequest({ cursor: 'cursor-123' });
      await GET(request);

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'cursor-123' },
          skip: 1,
        })
      );
    });

    it('should respect custom limit', async () => {
      mockPrisma.session.count.mockResolvedValue(10);
      mockPrisma.session.findMany.mockResolvedValue([]);

      const request = createRequest({ limit: '10' });
      await GET(request);

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 11, // limit + 1
        })
      );
    });

    it('should cap limit at 50', async () => {
      mockPrisma.session.count.mockResolvedValue(10);
      mockPrisma.session.findMany.mockResolvedValue([]);

      const request = createRequest({ limit: '100' });
      await GET(request);

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 51, // 50 + 1
        })
      );
    });
  });

  it('should return empty array when no sessions', async () => {
    mockPrisma.session.count.mockResolvedValue(0);
    mockPrisma.session.findMany.mockResolvedValue([]);

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.sessions).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('should return 500 on database error', async () => {
    mockPrisma.session.count.mockRejectedValue(new Error('DB error'));

    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch sessions');
  });
});

describe('POST /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new session', async () => {
    const createdSession = {
      id: 'new-session-1',
      title: 'New Chat',
      claudeSessionId: null,
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
      settings: null,
      isArchived: false,
    };
    mockPrisma.session.create.mockResolvedValue(createdSession);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session).toMatchObject({
      id: 'new-session-1',
      title: 'New Chat',
      claudeSessionId: null,
      isArchived: false,
    });
  });

  it('should use translated title', async () => {
    const createdSession = {
      id: 'new-session-1',
      title: 'New Chat',
      claudeSessionId: null,
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
      settings: null,
      isArchived: false,
    };
    mockPrisma.session.create.mockResolvedValue(createdSession);

    await POST();

    expect(mockPrisma.session.create).toHaveBeenCalledWith({
      data: { title: 'New Chat' },
    });
  });

  it('should parse settings JSON', async () => {
    const createdSession = {
      id: 'new-session-1',
      title: 'New Chat',
      claudeSessionId: 'claude-123',
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
      settings: JSON.stringify({ workspacePath: '/home/user' }),
      isArchived: false,
    };
    mockPrisma.session.create.mockResolvedValue(createdSession);

    const response = await POST();
    const data = await response.json();

    expect(data.session.settings).toEqual({ workspacePath: '/home/user' });
  });

  it('should return 500 on database error', async () => {
    mockPrisma.session.create.mockRejectedValue(new Error('DB error'));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create session');
  });
});
