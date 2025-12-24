import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const mcpServers = await prisma.mCPServer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      mcpServers: mcpServers.map((server) => ({
        id: server.id,
        name: server.name,
        type: server.type,
        command: server.command,
        args: server.args ? JSON.parse(server.args) : null,
        env: server.env ? JSON.parse(server.env) : null,
        url: server.url,
        headers: server.headers ? JSON.parse(server.headers) : null,
        isEnabled: server.isEnabled,
        createdAt: server.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch MCP servers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCP servers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, command, args, env, url, headers } = body;

    const mcpServer = await prisma.mCPServer.create({
      data: {
        name,
        type,
        command,
        args: args ? JSON.stringify(args) : null,
        env: env ? JSON.stringify(env) : null,
        url,
        headers: headers ? JSON.stringify(headers) : null,
      },
    });

    return NextResponse.json({
      mcpServer: {
        id: mcpServer.id,
        name: mcpServer.name,
        type: mcpServer.type,
        command: mcpServer.command,
        args: mcpServer.args ? JSON.parse(mcpServer.args) : null,
        env: mcpServer.env ? JSON.parse(mcpServer.env) : null,
        url: mcpServer.url,
        headers: mcpServer.headers ? JSON.parse(mcpServer.headers) : null,
        isEnabled: mcpServer.isEnabled,
        createdAt: mcpServer.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to create MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to create MCP server' },
      { status: 500 }
    );
  }
}
