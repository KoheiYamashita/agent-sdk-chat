import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { GET as GET_BY_ID, PATCH, DELETE } from '../[id]/route';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    mCPServer: {
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
  mCPServer: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

function createRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

const mockMCPServer = {
  id: 'mcp-1',
  name: 'Test MCP Server',
  type: 'stdio',
  command: 'npx',
  args: JSON.stringify(['-y', '@modelcontextprotocol/server-everything']),
  env: JSON.stringify({ API_KEY: 'test-key' }),
  url: null,
  headers: null,
  isEnabled: true,
  createdAt: new Date('2024-01-15'),
};

const mockSSEServer = {
  id: 'mcp-2',
  name: 'SSE Server',
  type: 'sse',
  command: null,
  args: null,
  env: null,
  url: 'http://localhost:8080/sse',
  headers: JSON.stringify({ Authorization: 'Bearer token' }),
  isEnabled: true,
  createdAt: new Date('2024-01-16'),
};

describe('GET /api/mcp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return list of MCP servers', async () => {
    mockPrisma.mCPServer.findMany.mockResolvedValue([mockMCPServer, mockSSEServer]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mcpServers).toHaveLength(2);
    expect(data.mcpServers[0]).toMatchObject({
      id: 'mcp-1',
      name: 'Test MCP Server',
      type: 'stdio',
      command: 'npx',
    });
  });

  it('should parse JSON fields', async () => {
    mockPrisma.mCPServer.findMany.mockResolvedValue([mockMCPServer]);

    const response = await GET();
    const data = await response.json();

    expect(data.mcpServers[0].args).toEqual(['-y', '@modelcontextprotocol/server-everything']);
    expect(data.mcpServers[0].env).toEqual({ API_KEY: 'test-key' });
  });

  it('should handle null JSON fields', async () => {
    mockPrisma.mCPServer.findMany.mockResolvedValue([
      { ...mockMCPServer, args: null, env: null },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(data.mcpServers[0].args).toBeNull();
    expect(data.mcpServers[0].env).toBeNull();
  });

  it('should return empty array when no servers', async () => {
    mockPrisma.mCPServer.findMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(data.mcpServers).toEqual([]);
  });

  it('should return 500 on database error', async () => {
    mockPrisma.mCPServer.findMany.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch MCP servers');
  });
});

describe('POST /api/mcp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a stdio MCP server', async () => {
    mockPrisma.mCPServer.create.mockResolvedValue(mockMCPServer);

    const request = createRequest({
      name: 'Test MCP Server',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-everything'],
      env: { API_KEY: 'test-key' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mcpServer.name).toBe('Test MCP Server');
  });

  it('should create an SSE MCP server', async () => {
    mockPrisma.mCPServer.create.mockResolvedValue(mockSSEServer);

    const request = createRequest({
      name: 'SSE Server',
      type: 'sse',
      url: 'http://localhost:8080/sse',
      headers: { Authorization: 'Bearer token' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.mcpServer.type).toBe('sse');
    expect(data.mcpServer.url).toBe('http://localhost:8080/sse');
  });

  it('should stringify JSON fields when saving', async () => {
    mockPrisma.mCPServer.create.mockResolvedValue(mockMCPServer);

    const request = createRequest({
      name: 'Test',
      type: 'stdio',
      command: 'test',
      args: ['arg1', 'arg2'],
      env: { KEY: 'value' },
    });

    await POST(request);

    expect(mockPrisma.mCPServer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        args: JSON.stringify(['arg1', 'arg2']),
        env: JSON.stringify({ KEY: 'value' }),
      }),
    });
  });

  it('should handle null optional fields', async () => {
    mockPrisma.mCPServer.create.mockResolvedValue({
      ...mockMCPServer,
      args: null,
      env: null,
    });

    const request = createRequest({
      name: 'Test',
      type: 'stdio',
      command: 'test',
    });

    await POST(request);

    expect(mockPrisma.mCPServer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        args: null,
        env: null,
      }),
    });
  });

  it('should return 500 on database error', async () => {
    mockPrisma.mCPServer.create.mockRejectedValue(new Error('DB error'));

    const request = createRequest({ name: 'Test', type: 'stdio' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create MCP server');
  });
});

describe('GET /api/mcp/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a single MCP server', async () => {
    mockPrisma.mCPServer.findUnique.mockResolvedValue(mockMCPServer);

    const response = await GET_BY_ID(
      new Request('http://localhost:3000/api/mcp/mcp-1'),
      createParams('mcp-1')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mcpServer.id).toBe('mcp-1');
  });

  it('should return 404 when server not found', async () => {
    mockPrisma.mCPServer.findUnique.mockResolvedValue(null);

    const response = await GET_BY_ID(
      new Request('http://localhost:3000/api/mcp/nonexistent'),
      createParams('nonexistent')
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('MCP server not found');
  });

  it('should return 500 on database error', async () => {
    mockPrisma.mCPServer.findUnique.mockRejectedValue(new Error('DB error'));

    const response = await GET_BY_ID(
      new Request('http://localhost:3000/api/mcp/mcp-1'),
      createParams('mcp-1')
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch MCP server');
  });
});

describe('PATCH /api/mcp/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update an MCP server', async () => {
    mockPrisma.mCPServer.update.mockResolvedValue({
      ...mockMCPServer,
      name: 'Updated Server',
    });

    const request = new Request('http://localhost:3000/api/mcp/mcp-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Server' }),
    });

    const response = await PATCH(request, createParams('mcp-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mcpServer.name).toBe('Updated Server');
  });

  it('should only update provided fields', async () => {
    mockPrisma.mCPServer.update.mockResolvedValue(mockMCPServer);

    const request = new Request('http://localhost:3000/api/mcp/mcp-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name', isEnabled: false }),
    });

    await PATCH(request, createParams('mcp-1'));

    expect(mockPrisma.mCPServer.update).toHaveBeenCalledWith({
      where: { id: 'mcp-1' },
      data: { name: 'New Name', isEnabled: false },
    });
  });

  it('should stringify JSON fields when updating', async () => {
    mockPrisma.mCPServer.update.mockResolvedValue(mockMCPServer);

    const request = new Request('http://localhost:3000/api/mcp/mcp-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        args: ['new-arg'],
        env: { NEW_KEY: 'new-value' },
        headers: { 'X-Custom': 'header' },
      }),
    });

    await PATCH(request, createParams('mcp-1'));

    expect(mockPrisma.mCPServer.update).toHaveBeenCalledWith({
      where: { id: 'mcp-1' },
      data: {
        args: JSON.stringify(['new-arg']),
        env: JSON.stringify({ NEW_KEY: 'new-value' }),
        headers: JSON.stringify({ 'X-Custom': 'header' }),
      },
    });
  });

  it('should return 500 on database error', async () => {
    mockPrisma.mCPServer.update.mockRejectedValue(new Error('DB error'));

    const request = new Request('http://localhost:3000/api/mcp/mcp-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });

    const response = await PATCH(request, createParams('mcp-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update MCP server');
  });
});

describe('DELETE /api/mcp/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete an MCP server', async () => {
    mockPrisma.mCPServer.delete.mockResolvedValue(mockMCPServer);

    const response = await DELETE(
      new Request('http://localhost:3000/api/mcp/mcp-1', { method: 'DELETE' }),
      createParams('mcp-1')
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should return 500 on database error', async () => {
    mockPrisma.mCPServer.delete.mockRejectedValue(new Error('DB error'));

    const response = await DELETE(
      new Request('http://localhost:3000/api/mcp/mcp-1', { method: 'DELETE' }),
      createParams('mcp-1')
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete MCP server');
  });
});
