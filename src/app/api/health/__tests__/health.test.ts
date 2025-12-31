import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return healthy status', async () => {
    vi.setSystemTime(new Date('2024-01-15T10:30:00.000Z'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      status: 'healthy',
      timestamp: '2024-01-15T10:30:00.000Z',
    });
  });

  it('should return current timestamp', async () => {
    const now = new Date('2024-06-20T15:45:30.123Z');
    vi.setSystemTime(now);

    const response = await GET();
    const data = await response.json();

    expect(data.timestamp).toBe(now.toISOString());
  });

  it('should return 200 status code', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('should return JSON content type', async () => {
    const response = await GET();
    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
