import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { TagWithSessionCount, TagUpdateRequest } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH: Update a tag (rename)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await request.json()) as TagUpdateRequest;

    // Check if tag exists
    const existing = await prisma.tag.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'タグが見つかりません' }, { status: 404 });
    }

    // Validate name if provided
    if (body.name !== undefined) {
      const trimmedName = body.name.trim();
      if (!trimmedName) {
        return NextResponse.json(
          { error: 'タグ名を入力してください' },
          { status: 400 }
        );
      }

      // Check for duplicate name (excluding current tag)
      const duplicate = await prisma.tag.findFirst({
        where: {
          name: trimmedName,
          NOT: { id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: '同じ名前のタグが既に存在します' },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.tag.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
      },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    });

    const tag: TagWithSessionCount = {
      id: updated.id,
      name: updated.name,
      sessionCount: updated._count.sessions,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Failed to update tag:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a tag
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if tag exists
    const existing = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'タグが見つかりません' }, { status: 404 });
    }

    // Check if any sessions are associated
    if (existing._count.sessions > 0) {
      return NextResponse.json(
        {
          error: `このタグには${existing._count.sessions}件のセッションが紐づいています。先にセッションのタグを解除してください。`,
        },
        { status: 409 }
      );
    }

    await prisma.tag.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
