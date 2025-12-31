import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before importing
vi.mock('@/lib/claude/session-manager', () => ({
  sessionManager: {
    interruptQuery: vi.fn(),
  },
}));

vi.mock('@/lib/approval-manager', () => ({
  approvalManager: {
    interruptAllForSession: vi.fn(),
  },
}));

import { POST } from '../abort/route';
import { sessionManager } from '@/lib/claude/session-manager';
import { approvalManager } from '@/lib/approval-manager';

const mockInterruptQuery = sessionManager.interruptQuery as ReturnType<typeof vi.fn>;
const mockInterruptAllForSession = approvalManager.interruptAllForSession as ReturnType<typeof vi.fn>;

describe('POST /api/chat/abort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // Helper to create mock Request
  const createRequest = (body: unknown) => {
    return new Request('http://localhost:3000/api/chat/abort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  describe('successful abort', () => {
    it('should interrupt query successfully', async () => {
      mockInterruptAllForSession.mockReturnValue([]);
      mockInterruptQuery.mockResolvedValue(true);

      const response = await POST(
        createRequest({ sessionId: 'session-1' })
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({
        success: true,
        interruptedApprovalIds: [],
      });
      expect(mockInterruptAllForSession).toHaveBeenCalledWith('session-1');
      expect(mockInterruptQuery).toHaveBeenCalledWith('session-1');
    });

    it('should return interrupted approval ids', async () => {
      mockInterruptAllForSession.mockReturnValue(['approval-1', 'approval-2']);
      mockInterruptQuery.mockResolvedValue(true);

      const response = await POST(
        createRequest({ sessionId: 'session-1' })
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.interruptedApprovalIds).toEqual(['approval-1', 'approval-2']);
    });

    it('should succeed when only approvals are interrupted (no active query)', async () => {
      mockInterruptAllForSession.mockReturnValue(['approval-1']);
      mockInterruptQuery.mockResolvedValue(false); // No active query

      const response = await POST(
        createRequest({ sessionId: 'session-1' })
      );

      // Should still succeed because approvals were interrupted
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });
  });

  describe('validation errors', () => {
    it('should return 400 when sessionId is missing', async () => {
      const response = await POST(createRequest({}));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('sessionId is required');
    });
  });

  describe('not found', () => {
    it('should return 404 when no active query and no pending approvals', async () => {
      mockInterruptAllForSession.mockReturnValue([]);
      mockInterruptQuery.mockResolvedValue(false);

      const response = await POST(
        createRequest({ sessionId: 'non-existent' })
      );

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain('No active query found');
    });
  });

  describe('error handling', () => {
    it('should return 500 on internal error', async () => {
      mockInterruptAllForSession.mockImplementation(() => {
        throw new Error('Internal error');
      });

      const response = await POST(
        createRequest({ sessionId: 'session-1' })
      );

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe('Internal error');
    });

    it('should handle non-Error objects', async () => {
      mockInterruptAllForSession.mockImplementation(() => {
        throw 'String error';
      });

      const response = await POST(
        createRequest({ sessionId: 'session-1' })
      );

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.message).toBe('Unknown error');
    });
  });
});
