import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../sessions/route';
import { NextRequest } from 'next/server';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';

const mockPrisma = prisma as unknown as {
  session: { findMany: ReturnType<typeof vi.fn> };
  message: { findMany: ReturnType<typeof vi.fn> };
};

function createRequest(query: string | null): NextRequest {
  const url = query
    ? `http://localhost:3000/api/search/sessions?q=${encodeURIComponent(query)}`
    : 'http://localhost:3000/api/search/sessions';
  return new NextRequest(url);
}

describe('GET /api/search/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty or invalid query', () => {
    it('should return empty results for missing query', async () => {
      const request = createRequest(null);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        sessions: [],
        query: '',
      });
    });

    it('should return empty results for empty query', async () => {
      const request = createRequest('');
      const response = await GET(request);
      const data = await response.json();

      expect(data.sessions).toEqual([]);
    });

    it('should return empty results for whitespace-only query', async () => {
      const request = createRequest('   ');
      const response = await GET(request);
      const data = await response.json();

      expect(data.sessions).toEqual([]);
    });
  });

  describe('search by title', () => {
    it('should find sessions matching title', async () => {
      const mockSession = {
        id: 'session-1',
        title: 'Test Session',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-16'),
        isArchived: false,
        _count: { messages: 5 },
        tag: { id: 'tag-1', name: 'Work' },
      };

      // First call: title search, Second call: additional sessions from message search
      mockPrisma.session.findMany
        .mockResolvedValueOnce([mockSession])
        .mockResolvedValueOnce([]);
      mockPrisma.message.findMany.mockResolvedValue([]);

      const request = createRequest('Test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions).toHaveLength(1);
      expect(data.sessions[0]).toEqual({
        id: 'session-1',
        title: 'Test Session',
        createdAt: '2024-01-15T00:00:00.000Z',
        updatedAt: '2024-01-16T00:00:00.000Z',
        messageCount: 5,
        isArchived: false,
        tagId: 'tag-1',
        tagName: 'Work',
      });
    });

    it('should handle session without tag', async () => {
      const mockSession = {
        id: 'session-1',
        title: 'Test Session',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-16'),
        isArchived: false,
        _count: { messages: 3 },
        tag: null,
      };

      mockPrisma.session.findMany
        .mockResolvedValueOnce([mockSession])
        .mockResolvedValueOnce([]);
      mockPrisma.message.findMany.mockResolvedValue([]);

      const request = createRequest('Test');
      const response = await GET(request);
      const data = await response.json();

      expect(data.sessions[0].tagId).toBeNull();
      expect(data.sessions[0].tagName).toBeNull();
    });
  });

  describe('search by message content', () => {
    it('should find sessions by message content', async () => {
      mockPrisma.session.findMany
        .mockResolvedValueOnce([]) // No title matches
        .mockResolvedValueOnce([
          {
            id: 'session-2',
            title: 'Another Session',
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-11'),
            isArchived: false,
            _count: { messages: 10 },
            tag: null,
          },
        ]);

      mockPrisma.message.findMany.mockResolvedValue([{ sessionId: 'session-2' }]);

      const request = createRequest('specific content');
      const response = await GET(request);
      const data = await response.json();

      expect(data.sessions).toHaveLength(1);
      expect(data.sessions[0].id).toBe('session-2');
    });

    it('should not duplicate sessions found by both title and message', async () => {
      const mockSession = {
        id: 'session-1',
        title: 'Test Query',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-16'),
        isArchived: false,
        _count: { messages: 5 },
        tag: null,
      };

      // Title search finds session-1, additional session lookup returns empty
      // because session-1 is already in title matches
      mockPrisma.session.findMany
        .mockResolvedValueOnce([mockSession])
        .mockResolvedValueOnce([]);
      // Message also matches the same session
      mockPrisma.message.findMany.mockResolvedValue([{ sessionId: 'session-1' }]);

      const request = createRequest('Query');
      const response = await GET(request);
      const data = await response.json();

      // Should only appear once
      expect(data.sessions).toHaveLength(1);
    });
  });

  describe('combined results', () => {
    it('should combine title matches and message matches', async () => {
      const titleMatchSession = {
        id: 'session-1',
        title: 'Search Term Here',
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-21'),
        isArchived: false,
        _count: { messages: 3 },
        tag: null,
      };

      const messageMatchSession = {
        id: 'session-2',
        title: 'Different Title',
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-11'),
        isArchived: false,
        _count: { messages: 7 },
        tag: { id: 'tag-1', name: 'Personal' },
      };

      mockPrisma.session.findMany
        .mockResolvedValueOnce([titleMatchSession])
        .mockResolvedValueOnce([messageMatchSession]);

      mockPrisma.message.findMany.mockResolvedValue([{ sessionId: 'session-2' }]);

      const request = createRequest('Search Term');
      const response = await GET(request);
      const data = await response.json();

      expect(data.sessions).toHaveLength(2);
      expect(data.sessions[0].id).toBe('session-1'); // Title match first
      expect(data.sessions[1].id).toBe('session-2'); // Message match second
    });
  });

  describe('archived sessions', () => {
    it('should include archived sessions in results', async () => {
      const mockSession = {
        id: 'session-archived',
        title: 'Archived Test',
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-06'),
        isArchived: true,
        _count: { messages: 2 },
        tag: null,
      };

      mockPrisma.session.findMany
        .mockResolvedValueOnce([mockSession])
        .mockResolvedValueOnce([]);
      mockPrisma.message.findMany.mockResolvedValue([]);

      const request = createRequest('Archived');
      const response = await GET(request);
      const data = await response.json();

      expect(data.sessions[0].isArchived).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.session.findMany.mockRejectedValue(new Error('Database error'));

      const request = createRequest('test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to search sessions');
    });
  });

  describe('query normalization', () => {
    it('should trim whitespace from query', async () => {
      mockPrisma.session.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.message.findMany.mockResolvedValue([]);

      const request = createRequest('  trimmed  ');
      const response = await GET(request);
      const data = await response.json();

      expect(data.query).toBe('trimmed');
    });
  });
});
