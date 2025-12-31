import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    settings: {
      findUnique: vi.fn(),
    },
    customModel: {
      findUnique: vi.fn(),
    },
    skill: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/approval-manager', () => ({
  approvalManager: {
    waitForApproval: vi.fn(),
  },
}));

vi.mock('@/lib/claude/session-manager', () => ({
  sessionManager: {
    registerQuery: vi.fn(),
    unregisterQuery: vi.fn(),
  },
}));

vi.mock('@/lib/claude/title-generator', () => ({
  generateSessionTitle: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    writeFile: vi.fn(),
  },
}));

import { POST } from '../route';
import { prisma } from '@/lib/db/prisma';
import { query } from '@anthropic-ai/claude-agent-sdk';

const mockFindUnique = prisma.session.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockCreate = prisma.session.create as unknown as ReturnType<typeof vi.fn>;
const mockSettingsFindUnique = prisma.settings.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockCustomModelFindUnique = prisma.customModel.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockSkillFindMany = prisma.skill.findMany as unknown as ReturnType<typeof vi.fn>;
const mockQuery = query as unknown as ReturnType<typeof vi.fn>;

function createRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default mocks
    mockSettingsFindUnique.mockResolvedValue(null);
    mockCustomModelFindUnique.mockResolvedValue(null);
    mockSkillFindMany.mockResolvedValue([]);
  });

  // Note: The chat route doesn't have explicit message validation.
  // Empty messages will create sessions with empty titles.
  // API key validation happens later in the SSE stream flow.

  describe('session handling', () => {
    it('should return 404 when session not found', async () => {
      mockFindUnique.mockResolvedValue(null);
      mockSettingsFindUnique.mockImplementation(async ({ where }) => {
        if (where.key === 'danger') {
          return {
            key: 'danger',
            value: JSON.stringify({ useSubscriptionPlan: true }),
          };
        }
        return null;
      });

      const response = await POST(createRequest({
        sessionId: 'non-existent',
        message: 'Hello',
      }));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Session not found');
    });
  });

  // Note: Streaming tests are complex and would require extensive mocking
  // of the SDK's async generator. The core streaming behavior is tested
  // through integration tests.
});
