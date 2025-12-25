import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    const sessionSummaries = sessions.map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messageCount: session._count.messages,
      isArchived: session.isArchived,
    }));

    return NextResponse.json({
      sessions: sessionSummaries,
      total: sessionSummaries.length,
    });
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await prisma.session.create({
      data: {
        title: '新規チャット',
      },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        claudeSessionId: session.claudeSessionId,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        settings: session.settings ? JSON.parse(session.settings) : null,
        isArchived: session.isArchived,
      },
    });
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
