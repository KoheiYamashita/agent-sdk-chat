import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { TitleGenerationSettings } from '@/types';

// Mock SDK before importing
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

import { generateSessionTitle } from '../title-generator';
import { query as sdkQuery } from '@anthropic-ai/claude-agent-sdk';

const mockSdkQuery = sdkQuery as ReturnType<typeof vi.fn>;

describe('generateSessionTitle', () => {
  const defaultSettings: TitleGenerationSettings = {
    enabled: true,
    model: 'claude-3-5-haiku-20241022',
    prompt: 'Generate a title for: <chat_history>',
  };

  // Helper to create a mock query result
  const createMockQueryResult = (result: string) => ({
    async *[Symbol.asyncIterator]() {
      yield { type: 'result', result };
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('when disabled', () => {
    it('should return null when generation is disabled', async () => {
      const settings: TitleGenerationSettings = {
        ...defaultSettings,
        enabled: false,
      };

      const result = await generateSessionTitle({
        userMessage: 'Hello, world!',
        settings,
      });

      expect(result).toBeNull();
      expect(mockSdkQuery).not.toHaveBeenCalled();
    });
  });

  describe('when enabled', () => {
    it('should generate title from valid JSON response', async () => {
      mockSdkQuery.mockReturnValue(
        createMockQueryResult('{"title": "Hello World Chat"}')
      );

      const result = await generateSessionTitle({
        userMessage: 'Hello, world!',
        settings: defaultSettings,
      });

      expect(result).toBe('Hello World Chat');
      expect(mockSdkQuery).toHaveBeenCalledWith({
        prompt: 'Generate a title for: Hello, world!',
        options: {
          model: 'claude-3-5-haiku-20241022',
          maxTurns: 1,
          permissionMode: 'bypassPermissions',
        },
      });
    });

    it('should replace <chat_history> placeholder with user message', async () => {
      mockSdkQuery.mockReturnValue(
        createMockQueryResult('{"title": "Test Title"}')
      );

      await generateSessionTitle({
        userMessage: 'My test message',
        settings: {
          ...defaultSettings,
          prompt: 'Create title for conversation: <chat_history>',
        },
      });

      expect(mockSdkQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Create title for conversation: My test message',
        })
      );
    });

    it('should truncate user message to 1000 characters', async () => {
      const longMessage = 'a'.repeat(2000);
      mockSdkQuery.mockReturnValue(
        createMockQueryResult('{"title": "Long Message"}')
      );

      await generateSessionTitle({
        userMessage: longMessage,
        settings: defaultSettings,
      });

      expect(mockSdkQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('a'.repeat(1000)),
        })
      );
      // Should not contain full 2000 chars
      const calledPrompt = mockSdkQuery.mock.calls[0][0].prompt;
      expect(calledPrompt.length).toBeLessThan(2000);
    });

    it('should use default model when not specified', async () => {
      mockSdkQuery.mockReturnValue(
        createMockQueryResult('{"title": "Default Model"}')
      );

      await generateSessionTitle({
        userMessage: 'Test',
        settings: {
          ...defaultSettings,
          model: '', // Empty model
        },
      });

      expect(mockSdkQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            model: 'claude-3-5-haiku-20241022', // Default
          }),
        })
      );
    });
  });

  describe('title parsing and sanitization', () => {
    it('should extract title from JSON response', async () => {
      mockSdkQuery.mockReturnValue(
        createMockQueryResult('Some text before {"title": "Extracted Title"} and after')
      );

      const result = await generateSessionTitle({
        userMessage: 'Test',
        settings: defaultSettings,
      });

      expect(result).toBe('Extracted Title');
    });

    it('should sanitize XSS characters from title', async () => {
      mockSdkQuery.mockReturnValue(
        createMockQueryResult('{"title": "<script>alert(\'xss\')</script>"}')
      );

      const result = await generateSessionTitle({
        userMessage: 'Test',
        settings: defaultSettings,
      });

      expect(result).toBe('scriptalert(xss)/script');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain("'");
    });

    it('should remove dangerous characters', async () => {
      mockSdkQuery.mockReturnValue(
        createMockQueryResult('{"title": "Test <>&\\"\'"}')
      );

      const result = await generateSessionTitle({
        userMessage: 'Test',
        settings: defaultSettings,
      });

      // All dangerous chars should be removed
      expect(result).toBe('Test');
    });

    it('should truncate long titles to 100 characters', async () => {
      const longTitle = 'a'.repeat(200);
      mockSdkQuery.mockReturnValue(
        createMockQueryResult(`{"title": "${longTitle}"}`)
      );

      const result = await generateSessionTitle({
        userMessage: 'Test',
        settings: defaultSettings,
      });

      expect(result).toHaveLength(100);
    });

    it('should use raw response when no JSON found', async () => {
      mockSdkQuery.mockReturnValue(
        createMockQueryResult('Simple Title Without JSON')
      );

      const result = await generateSessionTitle({
        userMessage: 'Test',
        settings: defaultSettings,
      });

      expect(result).toBe('Simple Title Without JSON');
    });

    it('should truncate raw response to 50 characters', async () => {
      const longResponse = 'a'.repeat(100);
      mockSdkQuery.mockReturnValue(createMockQueryResult(longResponse));

      const result = await generateSessionTitle({
        userMessage: 'Test',
        settings: defaultSettings,
      });

      expect(result).toHaveLength(50);
    });

    it('should return null for empty title in JSON', async () => {
      mockSdkQuery.mockReturnValue(
        createMockQueryResult('{"title": ""}')
      );

      const result = await generateSessionTitle({
        userMessage: 'Test',
        settings: defaultSettings,
      });

      expect(result).toBeNull();
    });

    it('should return null for whitespace-only title', async () => {
      mockSdkQuery.mockReturnValue(
        createMockQueryResult('{"title": "   "}')
      );

      const result = await generateSessionTitle({
        userMessage: 'Test',
        settings: defaultSettings,
      });

      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should return null when SDK query throws error', async () => {
      mockSdkQuery.mockImplementation(() => {
        throw new Error('SDK error');
      });

      const result = await generateSessionTitle({
        userMessage: 'Test',
        settings: defaultSettings,
      });

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Title generation failed:',
        expect.any(Error)
      );
    });

    it('should handle malformed JSON gracefully', async () => {
      mockSdkQuery.mockReturnValue(
        createMockQueryResult('{"title": broken json}')
      );

      const result = await generateSessionTitle({
        userMessage: 'Test',
        settings: defaultSettings,
      });

      // Should fall back to sanitized raw response
      expect(result).not.toBeNull();
    });
  });
});
