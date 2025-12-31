import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock approval manager before importing
vi.mock('@/lib/approval-manager', () => ({
  approvalManager: {
    resolveApproval: vi.fn(),
  },
}));

import { POST } from '../approve/route';
import { approvalManager } from '@/lib/approval-manager';

const mockResolveApproval = approvalManager.resolveApproval as ReturnType<typeof vi.fn>;

describe('POST /api/chat/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // Helper to create mock Request
  const createRequest = (body: unknown) => {
    return new Request('http://localhost:3000/api/chat/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  describe('successful approval', () => {
    it('should resolve approval with allow decision', async () => {
      mockResolveApproval.mockReturnValue(true);

      const response = await POST(
        createRequest({ requestId: 'req-1', decision: 'allow' })
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({ success: true });
      expect(mockResolveApproval).toHaveBeenCalledWith('req-1', {
        requestId: 'req-1',
        decision: 'allow',
      });
    });

    it('should resolve approval with deny decision', async () => {
      mockResolveApproval.mockReturnValue(true);

      const response = await POST(
        createRequest({ requestId: 'req-2', decision: 'deny' })
      );

      expect(response.status).toBe(200);
      expect(mockResolveApproval).toHaveBeenCalledWith('req-2', {
        requestId: 'req-2',
        decision: 'deny',
      });
    });

    it('should resolve approval with always decision', async () => {
      mockResolveApproval.mockReturnValue(true);

      const response = await POST(
        createRequest({ requestId: 'req-3', decision: 'always' })
      );

      expect(response.status).toBe(200);
      expect(mockResolveApproval).toHaveBeenCalledWith('req-3', {
        requestId: 'req-3',
        decision: 'always',
      });
    });
  });

  describe('validation errors', () => {
    it('should return 400 when requestId is missing', async () => {
      const response = await POST(
        createRequest({ decision: 'allow' })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('Missing requestId or decision');
    });

    it('should return 400 when decision is missing', async () => {
      const response = await POST(
        createRequest({ requestId: 'req-1' })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('Missing requestId or decision');
    });

    it('should return 400 when both are missing', async () => {
      const response = await POST(createRequest({}));

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid decision value', async () => {
      const response = await POST(
        createRequest({ requestId: 'req-1', decision: 'invalid' })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('Invalid decision');
    });

    it('should return 400 for interrupt decision (not allowed via API)', async () => {
      const response = await POST(
        createRequest({ requestId: 'req-1', decision: 'interrupt' })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('Invalid decision');
    });
  });

  describe('not found', () => {
    it('should return 404 when approval request not found', async () => {
      mockResolveApproval.mockReturnValue(false);

      const response = await POST(
        createRequest({ requestId: 'non-existent', decision: 'allow' })
      );

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toContain('not found or expired');
    });
  });

  describe('error handling', () => {
    it('should return 500 on internal error', async () => {
      mockResolveApproval.mockImplementation(() => {
        throw new Error('Internal error');
      });

      const response = await POST(
        createRequest({ requestId: 'req-1', decision: 'allow' })
      );

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toContain('Internal server error');
    });
  });
});
