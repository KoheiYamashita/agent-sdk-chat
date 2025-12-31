import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateUUID } from '../uuid';

describe('generateUUID', () => {
  // Note: In Node.js environment with jsdom, crypto.randomUUID is available
  // These tests verify the output format regardless of which implementation is used

  it('should generate valid UUID v4 format', () => {
    const result = generateUUID();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(result).toMatch(uuidRegex);
  });

  it('should generate unique UUIDs', () => {
    const uuids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      uuids.add(generateUUID());
    }
    // All 100 UUIDs should be unique
    expect(uuids.size).toBe(100);
  });

  it('should always have "4" in position 14 (version)', () => {
    for (let i = 0; i < 20; i++) {
      const uuid = generateUUID();
      expect(uuid.charAt(14)).toBe('4');
    }
  });

  it('should have valid variant character in position 19', () => {
    for (let i = 0; i < 20; i++) {
      const uuid = generateUUID();
      const variantChar = uuid.charAt(19).toLowerCase();
      expect(['8', '9', 'a', 'b']).toContain(variantChar);
    }
  });

  it('should return string of correct length', () => {
    const uuid = generateUUID();
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with dashes)
    expect(uuid.length).toBe(36);
  });

  it('should have dashes at correct positions', () => {
    const uuid = generateUUID();
    expect(uuid.charAt(8)).toBe('-');
    expect(uuid.charAt(13)).toBe('-');
    expect(uuid.charAt(18)).toBe('-');
    expect(uuid.charAt(23)).toBe('-');
  });

  it('should only contain valid hex characters and dashes', () => {
    const uuid = generateUUID();
    const validChars = /^[0-9a-f-]+$/i;
    expect(uuid).toMatch(validChars);
  });
});

describe('generateUUID fallback', () => {
  // Test the fallback implementation when crypto.randomUUID is not available
  let originalRandomUUID: typeof crypto.randomUUID | undefined;

  beforeEach(() => {
    // Save original
    originalRandomUUID = crypto.randomUUID;
    // Remove randomUUID to trigger fallback
    // @ts-expect-error - intentionally setting to undefined for testing
    crypto.randomUUID = undefined;
  });

  afterEach(() => {
    // Restore original
    if (originalRandomUUID) {
      crypto.randomUUID = originalRandomUUID;
    }
  });

  it('should use fallback when crypto.randomUUID is not available', async () => {
    // Dynamic import to get fresh module with mocked crypto
    const { generateUUID: generateUUIDFallback } = await import('../uuid');

    const uuid = generateUUIDFallback();
    // Should still produce valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  });

  it('should generate unique UUIDs with fallback', async () => {
    const { generateUUID: generateUUIDFallback } = await import('../uuid');

    const uuids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      uuids.add(generateUUIDFallback());
    }
    expect(uuids.size).toBe(50);
  });

  it('should always have "4" in position 14 with fallback', async () => {
    const { generateUUID: generateUUIDFallback } = await import('../uuid');

    for (let i = 0; i < 10; i++) {
      const uuid = generateUUIDFallback();
      expect(uuid.charAt(14)).toBe('4');
    }
  });

  it('should have valid variant character with fallback', async () => {
    const { generateUUID: generateUUIDFallback } = await import('../uuid');

    for (let i = 0; i < 10; i++) {
      const uuid = generateUUIDFallback();
      const variantChar = uuid.charAt(19).toLowerCase();
      expect(['8', '9', 'a', 'b']).toContain(variantChar);
    }
  });
});
