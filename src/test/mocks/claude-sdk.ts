import { vi } from 'vitest';

// Mock Query object
export interface MockQuery {
  interrupt: ReturnType<typeof vi.fn>;
  [Symbol.asyncIterator]: () => AsyncGenerator<unknown>;
}

export const mockInterrupt = vi.fn().mockResolvedValue(undefined);

/**
 * Create a mock Query that yields the given messages
 */
export function createMockQuery(messages: unknown[]): MockQuery {
  return {
    interrupt: mockInterrupt,
    async *[Symbol.asyncIterator]() {
      for (const msg of messages) {
        yield msg;
      }
    },
  };
}

/**
 * Create a mock query function for the SDK
 */
export function createMockQueryFn(messages: unknown[]) {
  return vi.fn(() => createMockQuery(messages));
}

/**
 * Reset all mock functions
 */
export function resetMocks() {
  mockInterrupt.mockClear();
}
