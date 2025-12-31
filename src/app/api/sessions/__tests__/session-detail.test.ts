import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '../[id]/route';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock session manager and approval manager
vi.mock('@/lib/claude/session-manager', () => ({
  sessionManager: {
    hasActiveQuery: vi.fn(),
  },
}));

vi.mock('@/lib/approval-manager', () => ({
  approvalManager: {
    getPendingForSession: vi.fn(),
  },
}));

import { prisma } from '@/lib/db/prisma';
import { sessionManager } from '@/lib/claude/session-manager';
import { approvalManager } from '@/lib/approval-manager';

const mockPrisma = prisma as unknown as {
  session: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const mockSessionManager = sessionManager as unknown as {
  hasActiveQuery: ReturnType<typeof vi.fn>;
};

const mockApprovalManager = approvalManager as unknown as {
  getPendingForSession: ReturnType<typeof vi.fn>;
};

function createRouteParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createRequest(method: string, body?: object): Request {
  const options: RequestInit = { method };
  if (body) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  return new Request('http://localhost:3000/api/sessions/test-id', options);
}

describe('GET /api/sessions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionManager.hasActiveQuery.mockReturnValue(false);
    mockApprovalManager.getPendingForSession.mockReturnValue(null);
  });

  it('should return session with messages', async () => {
    const mockSession = {
      id: 'session-1',
      title: 'Test Session',
      claudeSessionId: 'claude-123',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      settings: JSON.stringify({ workspacePath: '/test' }),
      isArchived: false,
      messages: [
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
          durationMs: null,
          thinkingContent: null,
          createdAt: new Date('2024-01-01'),
        },
      ],
    };

    mockPrisma.session.findUnique.mockResolvedValue(mockSession);

    const response = await GET(createRequest('GET'), createRouteParams('session-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session.id).toBe('session-1');
    expect(data.session.title).toBe('Test Session');
    expect(data.messages).toHaveLength(1);
    expect(data.messages[0].content).toBe('Hello');
  });

  it('should expand assistant messages with tool calls', async () => {
    const mockSession = {
      id: 'session-1',
      title: 'Test Session',
      claudeSessionId: 'claude-123',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      settings: null,
      isArchived: false,
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Done!',
          toolCalls: JSON.stringify([
            { id: 'tool-1', name: 'Bash', input: { command: 'ls' }, status: 'success' },
          ]),
          inputTokens: 10,
          outputTokens: 20,
          cacheCreationInputTokens: null,
          cacheReadInputTokens: null,
          cost: 0.001,
          model: 'claude-sonnet',
          durationMs: 1000,
          thinkingContent: null,
          createdAt: new Date('2024-01-01'),
        },
      ],
    };

    mockPrisma.session.findUnique.mockResolvedValue(mockSession);

    const response = await GET(createRequest('GET'), createRouteParams('session-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should expand into 3 messages: tools, approval, content
    expect(data.messages.length).toBeGreaterThan(1);

    const toolsMessage = data.messages.find((m: { id: string }) => m.id === 'msg-1-tools');
    expect(toolsMessage).toBeDefined();
    expect(toolsMessage.toolCalls).toHaveLength(1);

    const approvalMessage = data.messages.find((m: { role: string }) => m.role === 'tool_approval');
    expect(approvalMessage).toBeDefined();
    expect(approvalMessage.toolApproval.isDangerous).toBe(true); // Bash is dangerous
  });

  it('should return 404 when session not found', async () => {
    mockPrisma.session.findUnique.mockResolvedValue(null);

    const response = await GET(createRequest('GET'), createRouteParams('non-existent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Session not found');
  });

  it('should include processing status', async () => {
    const mockSession = {
      id: 'session-1',
      title: 'Test Session',
      claudeSessionId: 'claude-123',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      settings: null,
      isArchived: false,
      messages: [],
    };

    mockPrisma.session.findUnique.mockResolvedValue(mockSession);
    mockSessionManager.hasActiveQuery.mockReturnValue(true);

    const response = await GET(createRequest('GET'), createRouteParams('session-1'));
    const data = await response.json();

    expect(data.session.isProcessing).toBe(true);
  });

  it('should include pending tool approval', async () => {
    const mockSession = {
      id: 'session-1',
      title: 'Test Session',
      claudeSessionId: 'claude-123',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      settings: null,
      isArchived: false,
      messages: [],
    };

    const mockPendingApproval = {
      requestId: 'req-1',
      toolName: 'Bash',
      toolInput: { command: 'rm -rf' },
    };

    mockPrisma.session.findUnique.mockResolvedValue(mockSession);
    mockApprovalManager.getPendingForSession.mockReturnValue(mockPendingApproval);

    const response = await GET(createRequest('GET'), createRouteParams('session-1'));
    const data = await response.json();

    expect(data.session.pendingToolApproval).toEqual(mockPendingApproval);
  });

  it('should return 500 on database error', async () => {
    mockPrisma.session.findUnique.mockRejectedValue(new Error('Database error'));

    const response = await GET(createRequest('GET'), createRouteParams('session-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch session');
  });
});

describe('PATCH /api/sessions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update session title', async () => {
    mockPrisma.session.update.mockResolvedValue({
      id: 'session-1',
      title: 'New Title',
      claudeSessionId: 'claude-123',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      settings: null,
      isArchived: false,
      tag: null,
    });

    const response = await PATCH(
      createRequest('PATCH', { title: 'New Title' }),
      createRouteParams('session-1')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session.title).toBe('New Title');
    expect(mockPrisma.session.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: expect.objectContaining({
        title: 'New Title',
        isAutoGeneratedTitle: false,
      }),
      include: expect.any(Object),
    });
  });

  it('should archive session', async () => {
    mockPrisma.session.update.mockResolvedValue({
      id: 'session-1',
      title: 'Test',
      claudeSessionId: 'claude-123',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      settings: null,
      isArchived: true,
      tag: null,
    });

    const response = await PATCH(
      createRequest('PATCH', { isArchived: true }),
      createRouteParams('session-1')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session.isArchived).toBe(true);
  });

  it('should update session settings', async () => {
    mockPrisma.session.update.mockResolvedValue({
      id: 'session-1',
      title: 'Test',
      claudeSessionId: 'claude-123',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      settings: JSON.stringify({ workspacePath: '/new/path' }),
      isArchived: false,
      tag: null,
    });

    const response = await PATCH(
      createRequest('PATCH', { settings: { workspacePath: '/new/path' } }),
      createRouteParams('session-1')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session.settings.workspacePath).toBe('/new/path');
  });

  it('should update session tag', async () => {
    mockPrisma.session.update.mockResolvedValue({
      id: 'session-1',
      title: 'Test',
      claudeSessionId: 'claude-123',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      settings: null,
      isArchived: false,
      tag: { id: 'tag-1', name: 'Work' },
    });

    const response = await PATCH(
      createRequest('PATCH', { tagId: 'tag-1' }),
      createRouteParams('session-1')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.session.tagId).toBe('tag-1');
    expect(data.session.tagName).toBe('Work');
  });

  it('should return 500 on database error', async () => {
    mockPrisma.session.update.mockRejectedValue(new Error('Database error'));

    const response = await PATCH(
      createRequest('PATCH', { title: 'New Title' }),
      createRouteParams('session-1')
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update session');
  });
});

describe('DELETE /api/sessions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete session successfully', async () => {
    mockPrisma.session.delete.mockResolvedValue({
      id: 'session-1',
    });

    const response = await DELETE(createRequest('DELETE'), createRouteParams('session-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPrisma.session.delete).toHaveBeenCalledWith({
      where: { id: 'session-1' },
    });
  });

  it('should return 500 on database error', async () => {
    mockPrisma.session.delete.mockRejectedValue(new Error('Database error'));

    const response = await DELETE(createRequest('DELETE'), createRouteParams('session-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete session');
  });
});
