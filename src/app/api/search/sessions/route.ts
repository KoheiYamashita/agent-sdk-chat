import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { SessionSearchResponse, SearchSessionResult } from '@/types/search';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 1) {
      return NextResponse.json<SessionSearchResponse>({
        sessions: [],
        query: query || '',
      });
    }

    const searchTerm = query.trim();

    // セッション名で検索
    const sessionsByTitle = await prisma.session.findMany({
      where: {
        title: {
          contains: searchTerm,
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    // メッセージ内容・モデル名で検索してセッションIDを取得
    const messagesWithSession = await prisma.message.findMany({
      where: {
        OR: [
          { content: { contains: searchTerm } },
          { thinkingContent: { contains: searchTerm } },
          { model: { contains: searchTerm } },
          { modelDisplayName: { contains: searchTerm } },
        ],
      },
      select: {
        sessionId: true,
      },
      distinct: ['sessionId'],
    });

    const sessionIdsFromMessages = messagesWithSession.map((m) => m.sessionId);

    // メッセージでマッチしたセッションを取得（タイトルでマッチしていないもの）
    const titleMatchedIds = new Set(sessionsByTitle.map((s) => s.id));
    const additionalSessionIds = sessionIdsFromMessages.filter(
      (id) => !titleMatchedIds.has(id)
    );

    const sessionsByMessage = await prisma.session.findMany({
      where: {
        id: {
          in: additionalSessionIds,
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    // 結果を統合（タイトルマッチを優先）
    const allSessions = [...sessionsByTitle, ...sessionsByMessage];

    const sessions: SearchSessionResult[] = allSessions.map((session) => ({
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt.toISOString(),
      messageCount: session._count.messages,
      isArchived: session.isArchived,
    }));

    return NextResponse.json<SessionSearchResponse>({
      sessions,
      query: searchTerm,
    });
  } catch (error) {
    console.error('Failed to search sessions:', error);
    return NextResponse.json(
      { error: 'Failed to search sessions' },
      { status: 500 }
    );
  }
}
