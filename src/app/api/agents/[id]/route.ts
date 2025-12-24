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

    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        prompt: agent.prompt,
        tools: agent.tools ? JSON.parse(agent.tools) : null,
        model: agent.model,
        isEnabled: agent.isEnabled,
        createdAt: agent.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to fetch agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
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
    if (body.description !== undefined) updateData.description = body.description;
    if (body.prompt !== undefined) updateData.prompt = body.prompt;
    if (body.tools !== undefined) updateData.tools = JSON.stringify(body.tools);
    if (body.model !== undefined) updateData.model = body.model;
    if (body.isEnabled !== undefined) updateData.isEnabled = body.isEnabled;

    const agent = await prisma.agent.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        prompt: agent.prompt,
        tools: agent.tools ? JSON.parse(agent.tools) : null,
        model: agent.model,
        isEnabled: agent.isEnabled,
        createdAt: agent.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to update agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.agent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
