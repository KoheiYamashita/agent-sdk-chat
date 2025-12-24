import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const mcpServer = await prisma.mCPServer.findUnique({
      where: { id },
    });

    if (!mcpServer) {
      return NextResponse.json(
        { error: 'MCP server not found' },
        { status: 404 }
      );
    }

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
    console.error('Failed to fetch MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCP server' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.command !== undefined) updateData.command = body.command;
    if (body.args !== undefined) updateData.args = JSON.stringify(body.args);
    if (body.env !== undefined) updateData.env = JSON.stringify(body.env);
    if (body.url !== undefined) updateData.url = body.url;
    if (body.headers !== undefined)
      updateData.headers = JSON.stringify(body.headers);
    if (body.isEnabled !== undefined) updateData.isEnabled = body.isEnabled;

    const mcpServer = await prisma.mCPServer.update({
      where: { id },
      data: updateData,
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
    console.error('Failed to update MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to update MCP server' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.mCPServer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to delete MCP server' },
      { status: 500 }
    );
  }
}
