import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { MessageSearchResponse, SearchMessageResult } from '@/types/search';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    if (!query || query.trim().length < 1) {
      return NextResponse.json<MessageSearchResponse>({
        messages: [],
        query: query || '',
        sessionId,
      });
    }

    const searchTerm = query.trim();

    // セッション内のメッセージを検索（モデル名も対象）
    const messages = await prisma.message.findMany({
      where: {
        sessionId,
        OR: [
          { content: { contains: searchTerm } },
          { thinkingContent: { contains: searchTerm } },
          { model: { contains: searchTerm } },
          { modelDisplayName: { contains: searchTerm } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    const results: SearchMessageResult[] = messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    }));

    return NextResponse.json<MessageSearchResponse>({
      messages: results,
      query: searchTerm,
      sessionId,
    });
  } catch (error) {
    console.error('Failed to search messages:', error);
    return NextResponse.json(
      { error: 'Failed to search messages' },
      { status: 500 }
    );
  }
}
