import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Query } from '@anthropic-ai/claude-agent-sdk';

// We need to create a fresh instance for each test since it's a singleton
// For this, we'll use vi.resetModules() and dynamic import

describe('SessionManager', () => {
  let sessionManager: typeof import('../session-manager').sessionManager;

  // Mock Query object factory
  const createMockQuery = (interruptFn = vi.fn().mockResolvedValue(undefined)): Query => ({
    interrupt: interruptFn,
  } as unknown as Query);

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Dynamically import to get a fresh singleton
    const module = await import('../session-manager');
    sessionManager = module.sessionManager;
  });

  describe('registerQuery', () => {
    it('should register a query for a session', () => {
      const mockQuery = createMockQuery();

      sessionManager.registerQuery('session-1', mockQuery);

      expect(sessionManager.hasActiveQuery('session-1')).toBe(true);
      expect(sessionManager.getActiveQueryCount()).toBe(1);
    });

    it('should replace existing query when registering for same session', () => {
      const query1 = createMockQuery();
      const query2 = createMockQuery();

      sessionManager.registerQuery('session-1', query1);
      sessionManager.registerQuery('session-1', query2);

      expect(sessionManager.getActiveQueryCount()).toBe(1);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('already has an active query')
      );
    });

    it('should handle multiple sessions independently', () => {
      const query1 = createMockQuery();
      const query2 = createMockQuery();
      const query3 = createMockQuery();

      sessionManager.registerQuery('session-1', query1);
      sessionManager.registerQuery('session-2', query2);
      sessionManager.registerQuery('session-3', query3);

      expect(sessionManager.getActiveQueryCount()).toBe(3);
      expect(sessionManager.hasActiveQuery('session-1')).toBe(true);
      expect(sessionManager.hasActiveQuery('session-2')).toBe(true);
      expect(sessionManager.hasActiveQuery('session-3')).toBe(true);
    });
  });

  describe('unregisterQuery', () => {
    it('should unregister a query for a session', () => {
      const mockQuery = createMockQuery();
      sessionManager.registerQuery('session-1', mockQuery);

      sessionManager.unregisterQuery('session-1');

      expect(sessionManager.hasActiveQuery('session-1')).toBe(false);
      expect(sessionManager.getActiveQueryCount()).toBe(0);
    });

    it('should handle unregistering non-existent session silently', () => {
      // Should not throw
      expect(() => {
        sessionManager.unregisterQuery('non-existent');
      }).not.toThrow();
    });

    it('should only remove specified session', () => {
      const query1 = createMockQuery();
      const query2 = createMockQuery();

      sessionManager.registerQuery('session-1', query1);
      sessionManager.registerQuery('session-2', query2);

      sessionManager.unregisterQuery('session-1');

      expect(sessionManager.hasActiveQuery('session-1')).toBe(false);
      expect(sessionManager.hasActiveQuery('session-2')).toBe(true);
      expect(sessionManager.getActiveQueryCount()).toBe(1);
    });
  });

  describe('interruptQuery', () => {
    it('should interrupt an active query and return true', async () => {
      const mockInterrupt = vi.fn().mockResolvedValue(undefined);
      const mockQuery = createMockQuery(mockInterrupt);

      sessionManager.registerQuery('session-1', mockQuery);

      const result = await sessionManager.interruptQuery('session-1');

      expect(result).toBe(true);
      expect(mockInterrupt).toHaveBeenCalledTimes(1);
    });

    it('should return false when no active query for session', async () => {
      const result = await sessionManager.interruptQuery('non-existent');

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('No active query found')
      );
    });

    it('should return false when interrupt throws an error', async () => {
      const mockInterrupt = vi.fn().mockRejectedValue(new Error('SDK error'));
      const mockQuery = createMockQuery(mockInterrupt);

      sessionManager.registerQuery('session-1', mockQuery);

      const result = await sessionManager.interruptQuery('session-1');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to interrupt query'),
        expect.any(Error)
      );
    });
  });

  describe('hasActiveQuery', () => {
    it('should return true for registered session', () => {
      sessionManager.registerQuery('session-1', createMockQuery());
      expect(sessionManager.hasActiveQuery('session-1')).toBe(true);
    });

    it('should return false for unregistered session', () => {
      expect(sessionManager.hasActiveQuery('non-existent')).toBe(false);
    });

    it('should return false after unregistering', () => {
      sessionManager.registerQuery('session-1', createMockQuery());
      sessionManager.unregisterQuery('session-1');
      expect(sessionManager.hasActiveQuery('session-1')).toBe(false);
    });
  });

  describe('getActiveQueryCount', () => {
    it('should return 0 when no queries registered', () => {
      expect(sessionManager.getActiveQueryCount()).toBe(0);
    });

    it('should return correct count as queries are added and removed', () => {
      sessionManager.registerQuery('session-1', createMockQuery());
      expect(sessionManager.getActiveQueryCount()).toBe(1);

      sessionManager.registerQuery('session-2', createMockQuery());
      expect(sessionManager.getActiveQueryCount()).toBe(2);

      sessionManager.unregisterQuery('session-1');
      expect(sessionManager.getActiveQueryCount()).toBe(1);

      sessionManager.unregisterQuery('session-2');
      expect(sessionManager.getActiveQueryCount()).toBe(0);
    });
  });

  describe('getActiveSessionIds', () => {
    it('should return empty array when no queries registered', () => {
      expect(sessionManager.getActiveSessionIds()).toEqual([]);
    });

    it('should return all active session ids', () => {
      sessionManager.registerQuery('session-1', createMockQuery());
      sessionManager.registerQuery('session-2', createMockQuery());
      sessionManager.registerQuery('session-3', createMockQuery());

      const ids = sessionManager.getActiveSessionIds();

      expect(ids).toHaveLength(3);
      expect(ids).toContain('session-1');
      expect(ids).toContain('session-2');
      expect(ids).toContain('session-3');
    });

    it('should not include unregistered sessions', () => {
      sessionManager.registerQuery('session-1', createMockQuery());
      sessionManager.registerQuery('session-2', createMockQuery());
      sessionManager.unregisterQuery('session-1');

      const ids = sessionManager.getActiveSessionIds();

      expect(ids).toEqual(['session-2']);
    });
  });
});
