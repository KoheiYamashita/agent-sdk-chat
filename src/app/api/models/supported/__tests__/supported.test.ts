import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mocks using vi.hoisted to avoid hoisting issues
const { mockInterrupt, mockSupportedModels, mockQuery } = vi.hoisted(() => {
  const mockInterrupt = vi.fn();
  const mockSupportedModels = vi.fn();
  const mockQuery = vi.fn(() => ({
    supportedModels: mockSupportedModels,
    interrupt: mockInterrupt,
  }));
  return { mockInterrupt, mockSupportedModels, mockQuery };
});

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: mockQuery,
}));

describe('GET /api/models/supported', () => {
  let testStartTime: number;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Each test gets a unique time to avoid cache conflicts
    testStartTime = Date.now() + Math.random() * 1e12;
    vi.setSystemTime(testStartTime);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return supported models from SDK', async () => {
    mockSupportedModels.mockResolvedValue([
      { value: 'claude-sonnet-4-20250514', displayName: 'Claude 4 Sonnet', description: 'Fast' },
      { value: 'claude-opus-4-5-20251101', displayName: 'Claude 4.5 Opus', description: 'Best' },
    ]);

    // Import fresh to avoid cache from previous tests
    vi.resetModules();
    const { GET } = await import('../route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.models).toHaveLength(2);
    expect(data.models[0]).toEqual({
      id: 'claude-sonnet-4-20250514',
      displayName: 'Claude 4 Sonnet',
      description: 'Fast',
    });
  });

  it('should call SDK with correct options', async () => {
    mockSupportedModels.mockResolvedValue([]);

    vi.resetModules();
    const { GET } = await import('../route');
    await GET();

    expect(mockQuery).toHaveBeenCalledWith({
      prompt: '',
      options: { maxTurns: 0 },
    });
  });

  it('should interrupt query after getting models', async () => {
    mockSupportedModels.mockResolvedValue([]);

    vi.resetModules();
    const { GET } = await import('../route');
    await GET();

    expect(mockInterrupt).toHaveBeenCalled();
  });

  it('should return fallback models on SDK error', async () => {
    mockSupportedModels.mockRejectedValue(new Error('SDK error'));

    vi.resetModules();
    const { GET } = await import('../route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.models).toHaveLength(3);
    expect(data.models.map((m: { id: string }) => m.id)).toContain('claude-sonnet-4-20250514');
    expect(data.models.map((m: { id: string }) => m.id)).toContain('claude-opus-4-5-20251101');
    expect(data.models.map((m: { id: string }) => m.id)).toContain('claude-3-5-haiku-20241022');
  });

  it('should return fallback models with correct structure', async () => {
    mockSupportedModels.mockRejectedValue(new Error('SDK error'));

    vi.resetModules();
    const { GET } = await import('../route');
    const response = await GET();
    const data = await response.json();

    data.models.forEach((model: { id: string; displayName: string; description: string }) => {
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('displayName');
      expect(model).toHaveProperty('description');
    });
  });

  it('should use cached models within cache duration', async () => {
    const mockModels = [
      { value: 'cached-model', displayName: 'Cached Model', description: 'Cached' },
    ];
    mockSupportedModels.mockResolvedValue(mockModels);

    vi.resetModules();
    const { GET } = await import('../route');

    // First call - should fetch from SDK
    await GET();
    expect(mockQuery).toHaveBeenCalledTimes(1);

    // Second call within cache duration - should use cache
    vi.advanceTimersByTime(60 * 1000); // 1 minute later
    await GET();
    expect(mockQuery).toHaveBeenCalledTimes(1); // Still 1, cache used

    // Third call after cache expires - should fetch again
    vi.advanceTimersByTime(5 * 60 * 1000); // 5 more minutes (total 6 minutes)
    await GET();
    expect(mockQuery).toHaveBeenCalledTimes(2); // Now 2, cache expired
  });
});
