import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../[id]/messages/route';
import { NextRequest } from 'next/server';

// Mock Prisma
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

import { prisma } from '@/lib/db/prisma';

const mockPrisma = prisma as unknown as {
  session: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  message: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

function createRouteParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createRequest(sessionId: string, params?: { cursor?: string; limit?: string }): NextRequest {
  const url = new URL(`http://localhost:3000/api/sessions/${sessionId}/messages`);
  if (params?.cursor) url.searchParams.set('cursor', params.cursor);
  if (params?.limit) url.searchParams.set('limit', params.limit);
  return new NextRequest(url);
}

describe('GET /api/sessions/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return messages with pagination info', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' });
    mockPrisma.message.count.mockResolvedValue(5);
    mockPrisma.message.findMany.mockResolvedValue([
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        toolCalls: null,
        inputTokens: 10,
        outputTokens: null,
        cacheCreationInputTokens: null,
        cacheReadInputTokens: null,
        cost: null,
        model: null,
        modelDisplayName: null,
        durationMs: null,
        thinkingContent: null,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there!',
        toolCalls: null,
        inputTokens: 5,
        outputTokens: 15,
        cacheCreationInputTokens: null,
        cacheReadInputTokens: null,
        cost: 0.001,
        model: 'claude-sonnet',
        modelDisplayName: 'Claude Sonnet',
        durationMs: 500,
        thinkingContent: null,
        createdAt: new Date('2024-01-01'),
      },
    ]);

    const response = await GET(createRequest('session-1'), createRouteParams('session-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.messages).toHaveLength(2);
    expect(data.total).toBe(5);
    expect(data.hasMore).toBe(false);
    expect(data.nextCursor).toBeNull();
  });

  it('should expand assistant messages with tool calls', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' });
    mockPrisma.message.count.mockResolvedValue(1);
    mockPrisma.message.findMany.mockResolvedValue([
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Done!',
        toolCalls: JSON.stringify([
          { id: 'tool-1', name: 'Write', input: { file_path: '/test.txt' }, status: 'success' },
        ]),
        inputTokens: null,
        outputTokens: null,
        cacheCreationInputTokens: null,
        cacheReadInputTokens: null,
        cost: null,
        model: null,
        modelDisplayName: null,
        durationMs: null,
        thinkingContent: null,
        createdAt: new Date('2024-01-01'),
      },
    ]);

    const response = await GET(createRequest('session-1'), createRouteParams('session-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should expand into 3 messages: tools, approval, content
    expect(data.messages.length).toBeGreaterThan(1);

    const toolsMessage = data.messages.find((m: { id: string }) => m.id === 'msg-1-tools');
    expect(toolsMessage).toBeDefined();

    const approvalMessage = data.messages.find((m: { role: string }) => m.role === 'tool_approval');
    expect(approvalMessage).toBeDefined();
    expect(approvalMessage.toolApproval.isDangerous).toBe(true); // Write is dangerous
  });

  it('should handle pagination with limit', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' });
    mockPrisma.message.count.mockResolvedValue(10);

    // Return limit + 1 messages to indicate there are more
    const messages = Array.from({ length: 6 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
      toolCalls: null,
      inputTokens: null,
      outputTokens: null,
      cacheCreationInputTokens: null,
      cacheReadInputTokens: null,
      cost: null,
      model: null,
      modelDisplayName: null,
      durationMs: null,
      thinkingContent: null,
      createdAt: new Date(`2024-01-0${i + 1}`),
    }));
    mockPrisma.message.findMany.mockResolvedValue(messages);

    const response = await GET(createRequest('session-1', { limit: '5' }), createRouteParams('session-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasMore).toBe(true);
    expect(data.nextCursor).toBeDefined();
  });

  it('should handle cursor-based pagination', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' });
    mockPrisma.message.count.mockResolvedValue(10);
    mockPrisma.message.findMany.mockResolvedValue([
      {
        id: 'msg-5',
        role: 'user',
        content: 'Message 5',
        toolCalls: null,
        inputTokens: null,
        outputTokens: null,
        cacheCreationInputTokens: null,
        cacheReadInputTokens: null,
        cost: null,
        model: null,
        modelDisplayName: null,
        durationMs: null,
        thinkingContent: null,
        createdAt: new Date('2024-01-05'),
      },
    ]);

    const response = await GET(
      createRequest('session-1', { cursor: 'msg-4', limit: '5' }),
      createRouteParams('session-1')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 'msg-4' },
        skip: 1,
      })
    );
  });

  it('should limit to maximum 100 messages', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' });
    mockPrisma.message.count.mockResolvedValue(200);
    mockPrisma.message.findMany.mockResolvedValue([]);

    await GET(createRequest('session-1', { limit: '200' }), createRouteParams('session-1'));

    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: -101, // limit capped at 100, +1 for pagination check
      })
    );
  });

  it('should return 404 when session not found', async () => {
    mockPrisma.session.findUnique.mockResolvedValue(null);

    const response = await GET(createRequest('non-existent'), createRouteParams('non-existent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('should return 500 on database error', async () => {
    mockPrisma.session.findUnique.mockRejectedValue(new Error('Database error'));

    const response = await GET(createRequest('session-1'), createRouteParams('session-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch messages');
  });

  it('should include model display name in response', async () => {
    mockPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' });
    mockPrisma.message.count.mockResolvedValue(1);
    mockPrisma.message.findMany.mockResolvedValue([
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Hello',
        toolCalls: null,
        inputTokens: 10,
        outputTokens: 20,
        cacheCreationInputTokens: null,
        cacheReadInputTokens: null,
        cost: 0.001,
        model: 'claude-sonnet-4-20250514',
        modelDisplayName: 'Claude Sonnet 4',
        durationMs: 500,
        thinkingContent: 'Thinking...',
        createdAt: new Date('2024-01-01'),
      },
    ]);

    const response = await GET(createRequest('session-1'), createRouteParams('session-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.messages[0].modelDisplayName).toBe('Claude Sonnet 4');
    expect(data.messages[0].thinkingContent).toBe('Thinking...');
  });
});
