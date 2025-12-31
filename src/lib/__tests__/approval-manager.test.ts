import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ToolApprovalRequest, ToolApprovalResponse } from '@/types';

// Mock sessionManager before importing approval-manager
vi.mock('@/lib/claude/session-manager', () => ({
  sessionManager: {
    interruptQuery: vi.fn().mockResolvedValue(true),
  },
}));

// Import after mocking
import { approvalManager } from '../approval-manager';
import { sessionManager } from '@/lib/claude/session-manager';

const mockInterruptQuery = sessionManager.interruptQuery as ReturnType<typeof vi.fn>;

describe('ApprovalManager', () => {
  // Helper to create a mock request
  const createRequest = (id: string): ToolApprovalRequest => ({
    requestId: id,
    toolName: 'TestTool',
    toolInput: { test: 'input' },
    isDangerous: false,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Clear any pending approvals from previous tests
    // We do this by interrupting all sessions (we'll use a known session id pattern)
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up any remaining pending approvals
    approvalManager.interruptAllForSession('test-session-1');
    approvalManager.interruptAllForSession('test-session-2');
    approvalManager.interruptAllForSession('test-session-3');
  });

  describe('waitForApproval and resolveApproval', () => {
    it('should resolve with the provided response when resolveApproval is called', async () => {
      const request = createRequest('req-1');
      const response: ToolApprovalResponse = {
        requestId: 'req-1',
        decision: 'allow',
      };

      // Start waiting for approval (don't await yet)
      const approvalPromise = approvalManager.waitForApproval(
        'req-1',
        'test-session-1',
        request,
        0 // No timeout
      );

      // Verify it's pending
      expect(approvalManager.isPending('req-1')).toBe(true);
      expect(approvalManager.getPendingCount()).toBe(1);

      // Resolve the approval
      const resolved = approvalManager.resolveApproval('req-1', response);
      expect(resolved).toBe(true);

      // Await the result
      const result = await approvalPromise;
      expect(result).toEqual(response);

      // Verify it's no longer pending
      expect(approvalManager.isPending('req-1')).toBe(false);
      expect(approvalManager.getPendingCount()).toBe(0);
    });

    it('should handle all decision types correctly', async () => {
      const decisions: Array<'allow' | 'deny' | 'always' | 'interrupt'> = [
        'allow',
        'deny',
        'always',
        'interrupt',
      ];

      for (const decision of decisions) {
        const requestId = `req-${decision}`;
        const request = createRequest(requestId);

        const approvalPromise = approvalManager.waitForApproval(
          requestId,
          'test-session-1',
          request,
          0
        );

        approvalManager.resolveApproval(requestId, { requestId, decision });

        const result = await approvalPromise;
        expect(result.decision).toBe(decision);
      }
    });

    it('should return false when resolving non-existent request', () => {
      const result = approvalManager.resolveApproval('non-existent', {
        requestId: 'non-existent',
        decision: 'allow',
      });
      expect(result).toBe(false);
    });
  });

  describe('timeout handling', () => {
    it('should timeout and interrupt after default timeout', async () => {
      const request = createRequest('req-timeout');
      const defaultTimeoutMs = 60 * 60 * 1000; // 1 hour

      const approvalPromise = approvalManager.waitForApproval(
        'req-timeout',
        'test-session-1',
        request
        // Uses default timeout
      );

      expect(approvalManager.isPending('req-timeout')).toBe(true);

      // Advance time to just before timeout
      await vi.advanceTimersByTimeAsync(defaultTimeoutMs - 1);
      expect(approvalManager.isPending('req-timeout')).toBe(true);

      // Advance time past timeout
      await vi.advanceTimersByTimeAsync(2);

      const result = await approvalPromise;
      expect(result.decision).toBe('interrupt');
      expect(mockInterruptQuery).toHaveBeenCalledWith('test-session-1');
      expect(approvalManager.isPending('req-timeout')).toBe(false);
    });

    it('should timeout with custom duration', async () => {
      const request = createRequest('req-custom-timeout');
      const customTimeoutMs = 5000;

      const approvalPromise = approvalManager.waitForApproval(
        'req-custom-timeout',
        'test-session-1',
        request,
        customTimeoutMs
      );

      await vi.advanceTimersByTimeAsync(customTimeoutMs + 1);

      const result = await approvalPromise;
      expect(result.decision).toBe('interrupt');
    });

    it('should not timeout when timeoutMs is 0 (unlimited)', async () => {
      const request = createRequest('req-unlimited');

      const approvalPromise = approvalManager.waitForApproval(
        'req-unlimited',
        'test-session-1',
        request,
        0 // Unlimited
      );

      // Advance time significantly
      await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000); // 24 hours

      // Should still be pending
      expect(approvalManager.isPending('req-unlimited')).toBe(true);

      // Manually resolve to clean up
      approvalManager.resolveApproval('req-unlimited', {
        requestId: 'req-unlimited',
        decision: 'allow',
      });

      const result = await approvalPromise;
      expect(result.decision).toBe('allow');
    });

    it('should clear timeout when resolved before timeout', async () => {
      const request = createRequest('req-early-resolve');

      const approvalPromise = approvalManager.waitForApproval(
        'req-early-resolve',
        'test-session-1',
        request,
        60000
      );

      // Resolve before timeout
      approvalManager.resolveApproval('req-early-resolve', {
        requestId: 'req-early-resolve',
        decision: 'allow',
      });

      const result = await approvalPromise;
      expect(result.decision).toBe('allow');

      // Advance time past original timeout
      await vi.advanceTimersByTimeAsync(70000);

      // interruptQuery should not have been called
      expect(mockInterruptQuery).not.toHaveBeenCalled();
    });
  });

  describe('interruptAllForSession', () => {
    it('should interrupt all pending requests for a session', async () => {
      const requests = [
        { id: 'req-a', session: 'test-session-1' },
        { id: 'req-b', session: 'test-session-1' },
        { id: 'req-c', session: 'test-session-2' },
      ];

      const promises = requests.map(({ id, session }) =>
        approvalManager.waitForApproval(id, session, createRequest(id), 0)
      );

      expect(approvalManager.getPendingCount()).toBe(3);

      // Interrupt session 1
      const interruptedIds = approvalManager.interruptAllForSession('test-session-1');

      expect(interruptedIds).toEqual(['req-a', 'req-b']);
      expect(approvalManager.getPendingCount()).toBe(1);
      expect(approvalManager.isPending('req-c')).toBe(true);

      // Verify interrupted promises resolve with 'interrupt'
      const [resultA, resultB] = await Promise.all([promises[0], promises[1]]);
      expect(resultA.decision).toBe('interrupt');
      expect(resultB.decision).toBe('interrupt');

      // Clean up remaining
      approvalManager.resolveApproval('req-c', {
        requestId: 'req-c',
        decision: 'allow',
      });
    });

    it('should return empty array when no pending requests for session', () => {
      const interruptedIds = approvalManager.interruptAllForSession('non-existent-session');
      expect(interruptedIds).toEqual([]);
    });

    it('should clear timeouts when interrupting', async () => {
      const request = createRequest('req-with-timeout');

      approvalManager.waitForApproval(
        'req-with-timeout',
        'test-session-1',
        request,
        60000
      );

      // Interrupt the session
      approvalManager.interruptAllForSession('test-session-1');

      // Advance time past original timeout
      await vi.advanceTimersByTimeAsync(70000);

      // interruptQuery should not have been called by timeout
      // (it was called during interruptAllForSession cleanup)
      expect(mockInterruptQuery).not.toHaveBeenCalled();
    });
  });

  describe('getPendingCount', () => {
    it('should return correct count as requests are added and resolved', async () => {
      expect(approvalManager.getPendingCount()).toBe(0);

      approvalManager.waitForApproval('req-1', 'test-session-1', createRequest('req-1'), 0);
      expect(approvalManager.getPendingCount()).toBe(1);

      approvalManager.waitForApproval('req-2', 'test-session-1', createRequest('req-2'), 0);
      expect(approvalManager.getPendingCount()).toBe(2);

      approvalManager.resolveApproval('req-1', { requestId: 'req-1', decision: 'allow' });
      expect(approvalManager.getPendingCount()).toBe(1);

      approvalManager.resolveApproval('req-2', { requestId: 'req-2', decision: 'deny' });
      expect(approvalManager.getPendingCount()).toBe(0);
    });
  });

  describe('isPending', () => {
    it('should return true for pending requests', () => {
      approvalManager.waitForApproval('req-pending', 'test-session-1', createRequest('req-pending'), 0);
      expect(approvalManager.isPending('req-pending')).toBe(true);

      // Clean up
      approvalManager.resolveApproval('req-pending', { requestId: 'req-pending', decision: 'allow' });
    });

    it('should return false for non-existent requests', () => {
      expect(approvalManager.isPending('non-existent')).toBe(false);
    });

    it('should return false after request is resolved', () => {
      approvalManager.waitForApproval('req-resolved', 'test-session-1', createRequest('req-resolved'), 0);
      approvalManager.resolveApproval('req-resolved', { requestId: 'req-resolved', decision: 'allow' });
      expect(approvalManager.isPending('req-resolved')).toBe(false);
    });
  });

  describe('getPendingForSession', () => {
    it('should return the pending request for a session', () => {
      const request = createRequest('req-session');
      approvalManager.waitForApproval('req-session', 'test-session-1', request, 0);

      const result = approvalManager.getPendingForSession('test-session-1');
      expect(result).toEqual(request);

      // Clean up
      approvalManager.resolveApproval('req-session', { requestId: 'req-session', decision: 'allow' });
    });

    it('should return null when no pending requests for session', () => {
      const result = approvalManager.getPendingForSession('non-existent-session');
      expect(result).toBeNull();
    });

    it('should return first pending request when multiple exist', () => {
      const request1 = createRequest('req-first');
      const request2 = createRequest('req-second');

      approvalManager.waitForApproval('req-first', 'test-session-1', request1, 0);
      approvalManager.waitForApproval('req-second', 'test-session-1', request2, 0);

      // Should return the first one found (order may vary based on Map iteration)
      const result = approvalManager.getPendingForSession('test-session-1');
      expect(result).not.toBeNull();
      expect(['req-first', 'req-second']).toContain(result?.requestId);

      // Clean up
      approvalManager.interruptAllForSession('test-session-1');
    });
  });

  describe('session isolation', () => {
    it('should isolate requests between different sessions', async () => {
      approvalManager.waitForApproval('req-s1', 'test-session-1', createRequest('req-s1'), 0);
      approvalManager.waitForApproval('req-s2', 'test-session-2', createRequest('req-s2'), 0);

      expect(approvalManager.getPendingForSession('test-session-1')?.requestId).toBe('req-s1');
      expect(approvalManager.getPendingForSession('test-session-2')?.requestId).toBe('req-s2');

      // Interrupt session 1 should not affect session 2
      approvalManager.interruptAllForSession('test-session-1');
      expect(approvalManager.isPending('req-s1')).toBe(false);
      expect(approvalManager.isPending('req-s2')).toBe(true);

      // Clean up
      approvalManager.interruptAllForSession('test-session-2');
    });
  });
});
