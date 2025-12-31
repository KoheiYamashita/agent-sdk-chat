import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before importing
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

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

import { GET, PATCH, DELETE } from '../[id]/route';
import { prisma } from '@/lib/db/prisma';
import { sessionManager } from '@/lib/claude/session-manager';
import { approvalManager } from '@/lib/approval-manager';

const mockSessionFindUnique = prisma.session.findUnique as ReturnType<typeof vi.fn>;
const mockSessionUpdate = prisma.session.update as ReturnType<typeof vi.fn>;
const mockSessionDelete = prisma.session.delete as ReturnType<typeof vi.fn>;
const mockHasActiveQuery = sessionManager.hasActiveQuery as ReturnType<typeof vi.fn>;
const mockGetPendingForSession = approvalManager.getPendingForSession as ReturnType<typeof vi.fn>;

describe('Session API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // Helper to create route params
  const createParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  // Helper to create mock Request with JSON body
  const createRequest = (body?: unknown) => {
    return new Request('http://localhost:3000/api/sessions/session-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  // Helper to create mock session
  const createMockSession = (overrides = {}) => ({
    id: 'session-1',
    title: 'Test Session',
    claudeSessionId: 'claude-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    settings: null,
    isArchived: false,
    messages: [],
    ...overrides,
  });

  describe('GET /api/sessions/[id]', () => {
    it('should return session with runtime state', async () => {
      mockSessionFindUnique.mockResolvedValue(createMockSession());
      mockHasActiveQuery.mockReturnValue(false);
      mockGetPendingForSession.mockReturnValue(null);

      const response = await GET(
        new Request('http://localhost:3000/api/sessions/session-1'),
        createParams('session-1')
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.session).toBeDefined();
      expect(json.session.id).toBe('session-1');
      expect(json.session.isProcessing).toBe(false);
      expect(json.session.pendingToolApproval).toBeNull();
    });

    it('should return isProcessing: true when query is active', async () => {
      mockSessionFindUnique.mockResolvedValue(createMockSession());
      mockHasActiveQuery.mockReturnValue(true);
      mockGetPendingForSession.mockReturnValue(null);

      const response = await GET(
        new Request('http://localhost:3000/api/sessions/session-1'),
        createParams('session-1')
      );

      const json = await response.json();
      expect(json.session.isProcessing).toBe(true);
    });

    it('should return pendingToolApproval when approval is pending', async () => {
      const pendingApproval = {
        requestId: 'req-1',
        toolName: 'Bash',
        toolInput: { command: 'ls' },
        isDangerous: true,
      };
      mockSessionFindUnique.mockResolvedValue(createMockSession());
      mockHasActiveQuery.mockReturnValue(true);
      mockGetPendingForSession.mockReturnValue(pendingApproval);

      const response = await GET(
        new Request('http://localhost:3000/api/sessions/session-1'),
        createParams('session-1')
      );

      const json = await response.json();
      expect(json.session.pendingToolApproval).toEqual(pendingApproval);
    });

    it('should parse settings JSON', async () => {
      mockSessionFindUnique.mockResolvedValue(
        createMockSession({
          settings: JSON.stringify({ workspacePath: '/test' }),
        })
      );
      mockHasActiveQuery.mockReturnValue(false);
      mockGetPendingForSession.mockReturnValue(null);

      const response = await GET(
        new Request('http://localhost:3000/api/sessions/session-1'),
        createParams('session-1')
      );

      const json = await response.json();
      expect(json.session.settings).toEqual({ workspacePath: '/test' });
    });

    it('should return 404 when session not found', async () => {
      mockSessionFindUnique.mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost:3000/api/sessions/non-existent'),
        createParams('non-existent')
      );

      expect(response.status).toBe(404);
    });

    it('should expand messages with tool calls', async () => {
      const toolCalls = [
        { id: 'tool-1', name: 'Read', input: { path: '/test' }, status: 'completed' },
      ];
      mockSessionFindUnique.mockResolvedValue(
        createMockSession({
          messages: [
            {
              id: 'msg-1',
              role: 'assistant',
              content: 'Here is the file',
              toolCalls: JSON.stringify(toolCalls),
              createdAt: new Date('2024-01-01'),
              inputTokens: 100,
              outputTokens: 50,
              cacheCreationInputTokens: null,
              cacheReadInputTokens: null,
              cost: 0.001,
              model: 'claude-3-5-sonnet',
              durationMs: 1000,
              thinkingContent: null,
            },
          ],
        })
      );
      mockHasActiveQuery.mockReturnValue(false);
      mockGetPendingForSession.mockReturnValue(null);

      const response = await GET(
        new Request('http://localhost:3000/api/sessions/session-1'),
        createParams('session-1')
      );

      const json = await response.json();
      // Should have: tools message, tool_approval, content message
      expect(json.messages.length).toBeGreaterThan(1);
    });
  });

  describe('PATCH /api/sessions/[id]', () => {
    it('should update session title', async () => {
      mockSessionUpdate.mockResolvedValue(
        createMockSession({ title: 'New Title', tag: null })
      );

      const response = await PATCH(
        createRequest({ title: 'New Title' }),
        createParams('session-1')
      );

      expect(response.status).toBe(200);
      expect(mockSessionUpdate).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { title: 'New Title', isAutoGeneratedTitle: false },
        include: { tag: { select: { id: true, name: true } } },
      });
    });

    it('should update isArchived', async () => {
      mockSessionUpdate.mockResolvedValue(
        createMockSession({ isArchived: true, tag: null })
      );

      const response = await PATCH(
        createRequest({ isArchived: true }),
        createParams('session-1')
      );

      expect(response.status).toBe(200);
      expect(mockSessionUpdate).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { isArchived: true },
        include: expect.any(Object),
      });
    });

    it('should update settings as JSON', async () => {
      mockSessionUpdate.mockResolvedValue(
        createMockSession({ settings: '{"workspacePath":"/new"}', tag: null })
      );

      const response = await PATCH(
        createRequest({ settings: { workspacePath: '/new' } }),
        createParams('session-1')
      );

      expect(response.status).toBe(200);
      expect(mockSessionUpdate).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { settings: '{"workspacePath":"/new"}' },
        include: expect.any(Object),
      });
    });

    it('should update tagId', async () => {
      mockSessionUpdate.mockResolvedValue(
        createMockSession({ tagId: 'tag-1', tag: { id: 'tag-1', name: 'Work' } })
      );

      const response = await PATCH(
        createRequest({ tagId: 'tag-1' }),
        createParams('session-1')
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.session.tagId).toBe('tag-1');
      expect(json.session.tagName).toBe('Work');
    });

    it('should return 500 on update error', async () => {
      mockSessionUpdate.mockRejectedValue(new Error('DB error'));

      const response = await PATCH(
        createRequest({ title: 'New Title' }),
        createParams('session-1')
      );

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/sessions/[id]', () => {
    it('should delete session successfully', async () => {
      mockSessionDelete.mockResolvedValue(createMockSession());

      const response = await DELETE(
        new Request('http://localhost:3000/api/sessions/session-1'),
        createParams('session-1')
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(mockSessionDelete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });

    it('should return 500 on delete error', async () => {
      mockSessionDelete.mockRejectedValue(new Error('DB error'));

      const response = await DELETE(
        new Request('http://localhost:3000/api/sessions/session-1'),
        createParams('session-1')
      );

      expect(response.status).toBe(500);
    });
  });
});
