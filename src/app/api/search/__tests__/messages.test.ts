import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../messages/route';
import { NextRequest } from 'next/server';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    message: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';

const mockPrisma = prisma as unknown as {
  message: { findMany: ReturnType<typeof vi.fn> };
};

function createRequest(params: { q?: string; sessionId?: string }): NextRequest {
  const searchParams = new URLSearchParams();
  if (params.q !== undefined) searchParams.set('q', params.q);
  if (params.sessionId !== undefined) searchParams.set('sessionId', params.sessionId);
  const url = `http://localhost:3000/api/search/messages?${searchParams.toString()}`;
  return new NextRequest(url);
}

const mockMessage = {
  id: 'msg-1',
  role: 'user',
  content: 'Hello, this is a test message',
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
};

describe('GET /api/search/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validation', () => {
    it('should return 400 when sessionId is missing', async () => {
      const request = createRequest({ q: 'test' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('sessionId is required');
    });

    it('should return empty results for missing query', async () => {
      const request = createRequest({ sessionId: 'session-1' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toEqual([]);
      expect(data.query).toBe('');
      expect(data.sessionId).toBe('session-1');
    });

    it('should return empty results for empty query', async () => {
      const request = createRequest({ q: '', sessionId: 'session-1' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.messages).toEqual([]);
    });

    it('should return empty results for whitespace-only query', async () => {
      const request = createRequest({ q: '   ', sessionId: 'session-1' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.messages).toEqual([]);
    });
  });

  describe('search functionality', () => {
    it('should search messages in session', async () => {
      mockPrisma.message.findMany.mockResolvedValue([mockMessage]);

      const request = createRequest({ q: 'test', sessionId: 'session-1' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0]).toEqual({
        id: 'msg-1',
        role: 'user',
        content: 'Hello, this is a test message',
        createdAt: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should search with correct parameters', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);

      const request = createRequest({ q: 'search term', sessionId: 'session-123' });
      await GET(request);

      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: {
          sessionId: 'session-123',
          OR: [
            { content: { contains: 'search term' } },
            { thinkingContent: { contains: 'search term' } },
            { model: { contains: 'search term' } },
            { modelDisplayName: { contains: 'search term' } },
          ],
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      });
    });

    it('should trim query whitespace', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);

      const request = createRequest({ q: '  trimmed  ', sessionId: 'session-1' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.query).toBe('trimmed');
    });

    it('should return multiple messages', async () => {
      const messages = [
        { ...mockMessage, id: 'msg-1' },
        { ...mockMessage, id: 'msg-2', role: 'assistant', content: 'Response message' },
        { ...mockMessage, id: 'msg-3', content: 'Another user message' },
      ];
      mockPrisma.message.findMany.mockResolvedValue(messages);

      const request = createRequest({ q: 'message', sessionId: 'session-1' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.messages).toHaveLength(3);
    });

    it('should return empty array when no matches', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);

      const request = createRequest({ q: 'nonexistent', sessionId: 'session-1' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.messages).toEqual([]);
    });
  });

  describe('response format', () => {
    it('should include sessionId in response', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);

      const request = createRequest({ q: 'test', sessionId: 'my-session' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.sessionId).toBe('my-session');
    });

    it('should include query in response', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);

      const request = createRequest({ q: 'my query', sessionId: 'session-1' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.query).toBe('my query');
    });
  });

  describe('error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.message.findMany.mockRejectedValue(new Error('Database error'));

      const request = createRequest({ q: 'test', sessionId: 'session-1' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to search messages');
    });
  });
});
