import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { Skill, SkillUpdateRequest } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get a single skill
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const dbSkill = await prisma.skill.findUnique({
      where: { id },
    });

    if (!dbSkill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    const skill: Skill = {
      id: dbSkill.id,
      name: dbSkill.name,
      displayName: dbSkill.displayName,
      description: dbSkill.description,
      content: dbSkill.content,
      isEnabled: dbSkill.isEnabled,
      sortOrder: dbSkill.sortOrder,
      createdAt: dbSkill.createdAt.toISOString(),
      updatedAt: dbSkill.updatedAt.toISOString(),
    };

    return NextResponse.json(skill);
  } catch (error) {
    console.error('Failed to fetch skill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skill' },
      { status: 500 }
    );
  }
}

// PUT: Update a skill
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await request.json()) as SkillUpdateRequest;

    // Check if skill exists
    const existing = await prisma.skill.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    // Build update data
    const updateData: {
      name?: string;
      displayName?: string;
      description?: string | null;
      content?: string;
      isEnabled?: boolean;
      sortOrder?: number;
    } = {};

    if (body.name !== undefined) {
      // Sanitize name
      const sanitizedName = body.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Check for duplicate name (excluding current skill)
      const duplicate = await prisma.skill.findFirst({
        where: {
          name: sanitizedName,
          NOT: { id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A skill with this name already exists' },
          { status: 409 }
        );
      }

      updateData.name = sanitizedName;
    }

    if (body.displayName !== undefined) {
      updateData.displayName = body.displayName;
    }

    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    if (body.content !== undefined) {
      updateData.content = body.content;
    }

    if (body.isEnabled !== undefined) {
      updateData.isEnabled = body.isEnabled;
    }

    if (body.sortOrder !== undefined) {
      updateData.sortOrder = body.sortOrder;
    }

    // Update the skill
    const updated = await prisma.skill.update({
      where: { id },
      data: updateData,
    });

    const skill: Skill = {
      id: updated.id,
      name: updated.name,
      displayName: updated.displayName,
      description: updated.description,
      content: updated.content,
      isEnabled: updated.isEnabled,
      sortOrder: updated.sortOrder,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return NextResponse.json(skill);
  } catch (error) {
    console.error('Failed to update skill:', error);
    return NextResponse.json(
      { error: 'Failed to update skill' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a skill
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if skill exists
    const existing = await prisma.skill.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    await prisma.skill.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete skill:', error);
    return NextResponse.json(
      { error: 'Failed to delete skill' },
      { status: 500 }
    );
  }
}
