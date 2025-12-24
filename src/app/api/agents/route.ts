import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        prompt: agent.prompt,
        tools: agent.tools ? JSON.parse(agent.tools) : null,
        model: agent.model,
        isEnabled: agent.isEnabled,
        createdAt: agent.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, prompt, tools, model } = body;

    const agent = await prisma.agent.create({
      data: {
        name,
        description,
        prompt,
        tools: tools ? JSON.stringify(tools) : null,
        model,
      },
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
    console.error('Failed to create agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
