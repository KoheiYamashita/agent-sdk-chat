import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { GET as GET_BY_ID, PATCH, DELETE } from '../[id]/route';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    agent: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';

const mockPrisma = prisma as unknown as {
  agent: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

function createRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

const mockAgent = {
  id: 'agent-1',
  name: 'Test Agent',
  description: 'A test agent',
  prompt: 'You are a helpful assistant.',
  tools: JSON.stringify(['read', 'write']),
  model: 'claude-sonnet-4-20250514',
  isEnabled: true,
  createdAt: new Date('2024-01-15'),
};

describe('GET /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return list of agents', async () => {
    mockPrisma.agent.findMany.mockResolvedValue([mockAgent]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agents).toHaveLength(1);
    expect(data.agents[0]).toMatchObject({
      id: 'agent-1',
      name: 'Test Agent',
      description: 'A test agent',
      isEnabled: true,
    });
  });

  it('should parse tools JSON', async () => {
    mockPrisma.agent.findMany.mockResolvedValue([mockAgent]);

    const response = await GET();
    const data = await response.json();

    expect(data.agents[0].tools).toEqual(['read', 'write']);
  });

  it('should handle null tools', async () => {
    mockPrisma.agent.findMany.mockResolvedValue([{ ...mockAgent, tools: null }]);

    const response = await GET();
    const data = await response.json();

    expect(data.agents[0].tools).toBeNull();
  });

  it('should return empty array when no agents', async () => {
    mockPrisma.agent.findMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(data.agents).toEqual([]);
  });

  it('should return 500 on database error', async () => {
    mockPrisma.agent.findMany.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch agents');
  });
});

describe('POST /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new agent', async () => {
    mockPrisma.agent.create.mockResolvedValue(mockAgent);

    const request = createRequest({
      name: 'Test Agent',
      description: 'A test agent',
      prompt: 'You are a helpful assistant.',
      tools: ['read', 'write'],
      model: 'claude-sonnet-4-20250514',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agent.name).toBe('Test Agent');
  });

  it('should stringify tools when saving', async () => {
    mockPrisma.agent.create.mockResolvedValue(mockAgent);

    const request = createRequest({
      name: 'Test Agent',
      tools: ['tool1', 'tool2'],
    });

    await POST(request);

    expect(mockPrisma.agent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tools: JSON.stringify(['tool1', 'tool2']),
      }),
    });
  });

  it('should handle null tools', async () => {
    mockPrisma.agent.create.mockResolvedValue({ ...mockAgent, tools: null });

    const request = createRequest({
      name: 'Test Agent',
    });

    await POST(request);

    expect(mockPrisma.agent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tools: null,
      }),
    });
  });

  it('should return 500 on database error', async () => {
    mockPrisma.agent.create.mockRejectedValue(new Error('DB error'));

    const request = createRequest({ name: 'Test Agent' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create agent');
  });
});

describe('GET /api/agents/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a single agent', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue(mockAgent);

    const response = await GET_BY_ID(
      new Request('http://localhost:3000/api/agents/agent-1'),
      createParams('agent-1')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agent.id).toBe('agent-1');
  });

  it('should return 404 when agent not found', async () => {
    mockPrisma.agent.findUnique.mockResolvedValue(null);

    const response = await GET_BY_ID(
      new Request('http://localhost:3000/api/agents/nonexistent'),
      createParams('nonexistent')
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Agent not found');
  });

  it('should return 500 on database error', async () => {
    mockPrisma.agent.findUnique.mockRejectedValue(new Error('DB error'));

    const response = await GET_BY_ID(
      new Request('http://localhost:3000/api/agents/agent-1'),
      createParams('agent-1')
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch agent');
  });
});

describe('PATCH /api/agents/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update an agent', async () => {
    mockPrisma.agent.update.mockResolvedValue({
      ...mockAgent,
      name: 'Updated Agent',
    });

    const request = new Request('http://localhost:3000/api/agents/agent-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Agent' }),
    });

    const response = await PATCH(request, createParams('agent-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agent.name).toBe('Updated Agent');
  });

  it('should only update provided fields', async () => {
    mockPrisma.agent.update.mockResolvedValue(mockAgent);

    const request = new Request('http://localhost:3000/api/agents/agent-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name', isEnabled: false }),
    });

    await PATCH(request, createParams('agent-1'));

    expect(mockPrisma.agent.update).toHaveBeenCalledWith({
      where: { id: 'agent-1' },
      data: { name: 'New Name', isEnabled: false },
    });
  });

  it('should stringify tools when updating', async () => {
    mockPrisma.agent.update.mockResolvedValue(mockAgent);

    const request = new Request('http://localhost:3000/api/agents/agent-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tools: ['new-tool'] }),
    });

    await PATCH(request, createParams('agent-1'));

    expect(mockPrisma.agent.update).toHaveBeenCalledWith({
      where: { id: 'agent-1' },
      data: { tools: JSON.stringify(['new-tool']) },
    });
  });

  it('should return 500 on database error', async () => {
    mockPrisma.agent.update.mockRejectedValue(new Error('DB error'));

    const request = new Request('http://localhost:3000/api/agents/agent-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });

    const response = await PATCH(request, createParams('agent-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update agent');
  });
});

describe('DELETE /api/agents/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete an agent', async () => {
    mockPrisma.agent.delete.mockResolvedValue(mockAgent);

    const response = await DELETE(
      new Request('http://localhost:3000/api/agents/agent-1', { method: 'DELETE' }),
      createParams('agent-1')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should return 500 on database error', async () => {
    mockPrisma.agent.delete.mockRejectedValue(new Error('DB error'));

    const response = await DELETE(
      new Request('http://localhost:3000/api/agents/agent-1', { method: 'DELETE' }),
      createParams('agent-1')
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete agent');
  });
});
