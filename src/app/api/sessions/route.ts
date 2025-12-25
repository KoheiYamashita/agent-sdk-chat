import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

const DEFAULT_PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10),
      50
    );

    // Get total count
    const total = await prisma.session.count();

    // Fetch sessions with cursor-based pagination
    const sessions = await prisma.session.findMany({
      take: limit + 1, // Fetch one extra to check if there are more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
      }),
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    // Check if there are more results
    const hasMore = sessions.length > limit;
    const sessionsToReturn = hasMore ? sessions.slice(0, -1) : sessions;
    const nextCursor = hasMore ? sessionsToReturn[sessionsToReturn.length - 1]?.id : null;

    const sessionSummaries = sessionsToReturn.map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messageCount: session._count.messages,
      isArchived: session.isArchived,
    }));

    return NextResponse.json({
      sessions: sessionSummaries,
      total,
      nextCursor,
      hasMore,
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
