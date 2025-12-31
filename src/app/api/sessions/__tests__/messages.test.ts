import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Prisma before importing
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
    },
    message: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { GET } from '../[id]/messages/route';
import { prisma } from '@/lib/db/prisma';

const mockSessionFindUnique = prisma.session.findUnique as ReturnType<typeof vi.fn>;
const mockMessageCount = prisma.message.count as ReturnType<typeof vi.fn>;
const mockMessageFindMany = prisma.message.findMany as ReturnType<typeof vi.fn>;

describe('GET /api/sessions/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // Helper to create mock NextRequest
  const createRequest = (url: string) => {
    return new NextRequest(new URL(url, 'http://localhost:3000'));
  };

  // Helper to create route params
  const createParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  // Helper to create mock message
  const createMockMessage = (
    id: string,
    role: string,
    content: string,
    options: { toolCalls?: unknown; createdAt?: Date } = {}
  ) => ({
    id,
    role,
    content,
    toolCalls: options.toolCalls ? JSON.stringify(options.toolCalls) : null,
    inputTokens: 100,
    outputTokens: 50,
    cacheCreationInputTokens: null,
    cacheReadInputTokens: null,
    cost: 0.001,
    model: 'claude-3-5-sonnet',
    modelDisplayName: null,
    durationMs: 1000,
    thinkingContent: null,
    createdAt: options.createdAt || new Date('2024-01-01'),
  });

  describe('successful requests', () => {
    it('should return messages for a valid session', async () => {
      mockSessionFindUnique.mockResolvedValue({ id: 'session-1' });
      mockMessageCount.mockResolvedValue(2);
      mockMessageFindMany.mockResolvedValue([
        createMockMessage('msg-1', 'user', 'Hello', { createdAt: new Date('2024-01-01T00:00:00Z') }),
        createMockMessage('msg-2', 'assistant', 'Hi there!', { createdAt: new Date('2024-01-01T00:01:00Z') }),
      ]);

      const response = await GET(
        createRequest('http://localhost:3000/api/sessions/session-1/messages'),
        createParams('session-1')
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.messages).toHaveLength(2);
      expect(json.total).toBe(2);
      expect(json.hasMore).toBe(false);
      expect(json.nextCursor).toBeNull();
    });

    it('should expand assistant messages with tool calls', async () => {
      const toolCalls = [
        { id: 'tool-1', name: 'Read', input: { path: '/test' }, status: 'completed' },
      ];

      mockSessionFindUnique.mockResolvedValue({ id: 'session-1' });
      mockMessageCount.mockResolvedValue(1);
      mockMessageFindMany.mockResolvedValue([
        createMockMessage('msg-1', 'assistant', 'Here is the file:', { toolCalls }),
      ]);

      const response = await GET(
        createRequest('http://localhost:3000/api/sessions/session-1/messages'),
        createParams('session-1')
      );

      const json = await response.json();
      // Should expand into: tools message, tool_approval message, content message
      expect(json.messages.length).toBeGreaterThanOrEqual(2);

      // Check for tool_approval message
      const approvalMessage = json.messages.find((m: { role: string }) => m.role === 'tool_approval');
      expect(approvalMessage).toBeDefined();
      expect(approvalMessage.toolApproval.toolName).toBe('Read');
    });

    it('should mark dangerous tools correctly', async () => {
      const toolCalls = [
        { id: 'tool-1', name: 'Bash', input: { command: 'ls' }, status: 'completed' },
      ];

      mockSessionFindUnique.mockResolvedValue({ id: 'session-1' });
      mockMessageCount.mockResolvedValue(1);
      mockMessageFindMany.mockResolvedValue([
        createMockMessage('msg-1', 'assistant', '', { toolCalls }),
      ]);

      const response = await GET(
        createRequest('http://localhost:3000/api/sessions/session-1/messages'),
        createParams('session-1')
      );

      const json = await response.json();
      const approvalMessage = json.messages.find((m: { role: string }) => m.role === 'tool_approval');
      expect(approvalMessage.toolApproval.isDangerous).toBe(true);
    });
  });

  describe('pagination', () => {
    it('should respect limit parameter', async () => {
      mockSessionFindUnique.mockResolvedValue({ id: 'session-1' });
      mockMessageCount.mockResolvedValue(50);
      mockMessageFindMany.mockResolvedValue([
        createMockMessage('msg-1', 'user', 'Hello'),
      ]);

      await GET(
        createRequest('http://localhost:3000/api/sessions/session-1/messages?limit=10'),
        createParams('session-1')
      );

      expect(mockMessageFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: -11, // limit + 1 (negated)
        })
      );
    });

    it('should cap limit at 100', async () => {
      mockSessionFindUnique.mockResolvedValue({ id: 'session-1' });
      mockMessageCount.mockResolvedValue(50);
      mockMessageFindMany.mockResolvedValue([]);

      await GET(
        createRequest('http://localhost:3000/api/sessions/session-1/messages?limit=500'),
        createParams('session-1')
      );

      expect(mockMessageFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: -101, // 100 + 1 (negated)
        })
      );
    });

    it('should use cursor for pagination', async () => {
      mockSessionFindUnique.mockResolvedValue({ id: 'session-1' });
      mockMessageCount.mockResolvedValue(50);
      mockMessageFindMany.mockResolvedValue([]);

      await GET(
        createRequest('http://localhost:3000/api/sessions/session-1/messages?cursor=cursor-id'),
        createParams('session-1')
      );

      expect(mockMessageFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'cursor-id' },
          skip: 1,
        })
      );
    });

    it('should indicate when there are more messages', async () => {
      mockSessionFindUnique.mockResolvedValue({ id: 'session-1' });
      mockMessageCount.mockResolvedValue(50);
      // Return more messages than limit to indicate hasMore
      mockMessageFindMany.mockResolvedValue([
        createMockMessage('msg-0', 'user', 'First', { createdAt: new Date('2024-01-01T00:00:00Z') }),
        createMockMessage('msg-1', 'user', 'Hello', { createdAt: new Date('2024-01-01T00:01:00Z') }),
        createMockMessage('msg-2', 'assistant', 'Hi', { createdAt: new Date('2024-01-01T00:02:00Z') }),
      ]);

      const response = await GET(
        createRequest('http://localhost:3000/api/sessions/session-1/messages?limit=2'),
        createParams('session-1')
      );

      const json = await response.json();
      expect(json.hasMore).toBe(true);
      expect(json.nextCursor).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should return 404 when session not found', async () => {
      mockSessionFindUnique.mockResolvedValue(null);

      const response = await GET(
        createRequest('http://localhost:3000/api/sessions/non-existent/messages'),
        createParams('non-existent')
      );

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe('Session not found');
    });

    it('should return 500 on database error', async () => {
      mockSessionFindUnique.mockRejectedValue(new Error('DB error'));

      const response = await GET(
        createRequest('http://localhost:3000/api/sessions/session-1/messages'),
        createParams('session-1')
      );

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toContain('Failed to fetch messages');
    });
  });
});
