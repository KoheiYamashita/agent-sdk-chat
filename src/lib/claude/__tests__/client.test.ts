import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ClaudeQueryOptions } from '../types';

// Mock SDK before importing
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

import { queryWithOptions } from '../client';
import { query as sdkQuery } from '@anthropic-ai/claude-agent-sdk';

const mockSdkQuery = sdkQuery as ReturnType<typeof vi.fn>;

describe('queryWithOptions', () => {
  // Helper to create mock SDK messages
  const createMockMessages = (messages: unknown[]) => ({
    async *[Symbol.asyncIterator]() {
      for (const msg of messages) {
        yield msg;
      }
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should yield all SDK messages', async () => {
      const mockMessages = [
        { type: 'system', subtype: 'init', session_id: 'test-session' },
        { type: 'stream_event', event: { type: 'content_block_delta', delta: { text: 'Hello' } } },
        { type: 'result', result: 'Hello World', usage: { input_tokens: 10, output_tokens: 5 } },
      ];

      mockSdkQuery.mockReturnValue(createMockMessages(mockMessages));

      const options: ClaudeQueryOptions = {
        prompt: 'Say hello',
      };

      const results: unknown[] = [];
      for await (const msg of queryWithOptions(options)) {
        results.push(msg);
      }

      expect(results).toEqual(mockMessages);
    });

    it('should call SDK with correct prompt', async () => {
      mockSdkQuery.mockReturnValue(createMockMessages([{ type: 'result', result: 'Done' }]));

      const options: ClaudeQueryOptions = {
        prompt: 'Test prompt',
      };

      // Consume the generator
      for await (const _ of queryWithOptions(options)) {
        // consume
      }

      expect(mockSdkQuery).toHaveBeenCalledWith({
        prompt: 'Test prompt',
        options: expect.objectContaining({
          includePartialMessages: true,
        }),
      });
    });
  });

  describe('options handling', () => {
    it('should pass resume option', async () => {
      mockSdkQuery.mockReturnValue(createMockMessages([]));

      const options: ClaudeQueryOptions = {
        prompt: 'Test',
        resume: 'previous-session-id',
      };

      for await (const _ of queryWithOptions(options)) { /* consume */ }

      expect(mockSdkQuery).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          resume: 'previous-session-id',
        }),
      });
    });

    it('should pass model option', async () => {
      mockSdkQuery.mockReturnValue(createMockMessages([]));

      const options: ClaudeQueryOptions = {
        prompt: 'Test',
        model: 'claude-3-5-sonnet-20241022',
      };

      for await (const _ of queryWithOptions(options)) { /* consume */ }

      expect(mockSdkQuery).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022',
        }),
      });
    });

    it('should pass allowedTools and disallowedTools', async () => {
      mockSdkQuery.mockReturnValue(createMockMessages([]));

      const options: ClaudeQueryOptions = {
        prompt: 'Test',
        allowedTools: ['Read', 'Write'],
        disallowedTools: ['Bash'],
      };

      for await (const _ of queryWithOptions(options)) { /* consume */ }

      expect(mockSdkQuery).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          allowedTools: ['Read', 'Write'],
          disallowedTools: ['Bash'],
        }),
      });
    });

    it('should pass permissionMode', async () => {
      mockSdkQuery.mockReturnValue(createMockMessages([]));

      const options: ClaudeQueryOptions = {
        prompt: 'Test',
        permissionMode: 'bypassPermissions',
      };

      for await (const _ of queryWithOptions(options)) { /* consume */ }

      expect(mockSdkQuery).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          permissionMode: 'bypassPermissions',
        }),
      });
    });

    it('should pass systemPrompt', async () => {
      mockSdkQuery.mockReturnValue(createMockMessages([]));

      const options: ClaudeQueryOptions = {
        prompt: 'Test',
        systemPrompt: 'You are a helpful assistant.',
      };

      for await (const _ of queryWithOptions(options)) { /* consume */ }

      expect(mockSdkQuery).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          systemPrompt: 'You are a helpful assistant.',
        }),
      });
    });

    it('should pass maxTurns', async () => {
      mockSdkQuery.mockReturnValue(createMockMessages([]));

      const options: ClaudeQueryOptions = {
        prompt: 'Test',
        maxTurns: 10,
      };

      for await (const _ of queryWithOptions(options)) { /* consume */ }

      expect(mockSdkQuery).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          maxTurns: 10,
        }),
      });
    });

    it('should pass mcpServers when provided', async () => {
      mockSdkQuery.mockReturnValue(createMockMessages([]));

      const options: ClaudeQueryOptions = {
        prompt: 'Test',
        mcpServers: {
          'file-server': {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@anthropic-ai/mcp-server-files'],
          },
        },
      };

      for await (const _ of queryWithOptions(options)) { /* consume */ }

      expect(mockSdkQuery).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          mcpServers: {
            'file-server': {
              type: 'stdio',
              command: 'npx',
              args: ['-y', '@anthropic-ai/mcp-server-files'],
            },
          },
        }),
      });
    });

    it('should pass agents when provided', async () => {
      mockSdkQuery.mockReturnValue(createMockMessages([]));

      const options: ClaudeQueryOptions = {
        prompt: 'Test',
        agents: {
          'code-reviewer': {
            description: 'Reviews code',
            prompt: 'Review this code',
            tools: ['Read'],
            model: 'sonnet',
          },
        },
      };

      for await (const _ of queryWithOptions(options)) { /* consume */ }

      expect(mockSdkQuery).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          agents: {
            'code-reviewer': {
              description: 'Reviews code',
              prompt: 'Review this code',
              tools: ['Read'],
              model: 'sonnet',
            },
          },
        }),
      });
    });

    it('should pass sandbox when provided', async () => {
      mockSdkQuery.mockReturnValue(createMockMessages([]));

      const options: ClaudeQueryOptions = {
        prompt: 'Test',
        sandbox: {
          enabled: true,
        },
      };

      for await (const _ of queryWithOptions(options)) { /* consume */ }

      expect(mockSdkQuery).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          sandbox: {
            enabled: true,
          },
        }),
      });
    });

    it('should not include optional options when not provided', async () => {
      mockSdkQuery.mockReturnValue(createMockMessages([]));

      const options: ClaudeQueryOptions = {
        prompt: 'Test',
      };

      for await (const _ of queryWithOptions(options)) { /* consume */ }

      const calledOptions = mockSdkQuery.mock.calls[0][0].options;

      // These should be undefined (not included)
      expect(calledOptions).not.toHaveProperty('mcpServers');
      expect(calledOptions).not.toHaveProperty('agents');
      expect(calledOptions).not.toHaveProperty('sandbox');
    });

    it('should always include includePartialMessages: true', async () => {
      mockSdkQuery.mockReturnValue(createMockMessages([]));

      const options: ClaudeQueryOptions = {
        prompt: 'Test',
      };

      for await (const _ of queryWithOptions(options)) { /* consume */ }

      expect(mockSdkQuery).toHaveBeenCalledWith({
        prompt: 'Test',
        options: expect.objectContaining({
          includePartialMessages: true,
        }),
      });
    });
  });

  describe('combined options', () => {
    it('should pass all options together', async () => {
      mockSdkQuery.mockReturnValue(createMockMessages([]));

      const options: ClaudeQueryOptions = {
        prompt: 'Complex query',
        resume: 'session-123',
        model: 'claude-opus-4-20250514',
        allowedTools: ['Read', 'Write', 'Bash'],
        disallowedTools: ['Delete'],
        permissionMode: 'acceptEdits',
        systemPrompt: 'Be helpful',
        maxTurns: 20,
        mcpServers: {
          'server-1': { type: 'http', url: 'http://localhost:3001' },
        },
        agents: {
          'agent-1': { description: 'Test', prompt: 'Test prompt' },
        },
        sandbox: { enabled: false },
      };

      for await (const _ of queryWithOptions(options)) { /* consume */ }

      expect(mockSdkQuery).toHaveBeenCalledWith({
        prompt: 'Complex query',
        options: {
          resume: 'session-123',
          model: 'claude-opus-4-20250514',
          allowedTools: ['Read', 'Write', 'Bash'],
          disallowedTools: ['Delete'],
          permissionMode: 'acceptEdits',
          systemPrompt: 'Be helpful',
          maxTurns: 20,
          includePartialMessages: true,
          mcpServers: {
            'server-1': { type: 'http', url: 'http://localhost:3001' },
          },
          agents: {
            'agent-1': { description: 'Test', prompt: 'Test prompt' },
          },
          sandbox: { enabled: false },
        },
      });
    });
  });
});
