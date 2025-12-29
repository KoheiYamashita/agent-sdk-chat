import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { TagWithSessionCount, TagsResponse, TagCreateRequest } from '@/types';

// GET: List all tags with session counts
export async function GET() {
  try {
    const dbTags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    });

    const tags: TagWithSessionCount[] = dbTags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      sessionCount: tag._count.sessions,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
    }));

    return NextResponse.json<TagsResponse>({ tags });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST: Create a new tag
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TagCreateRequest;

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'タグ名を入力してください' },
        { status: 400 }
      );
    }

    const trimmedName = body.name.trim();

    // Check for duplicate name
    const existing = await prisma.tag.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      return NextResponse.json(
        { error: '同じ名前のタグが既に存在します' },
        { status: 409 }
      );
    }

    const created = await prisma.tag.create({
      data: {
        name: trimmedName,
      },
    });

    const tag: TagWithSessionCount = {
      id: created.id,
      name: created.name,
      sessionCount: 0,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Failed to create tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
