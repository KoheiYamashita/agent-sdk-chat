import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { Skill, SkillsResponse, SkillCreateRequest } from '@/types';

// GET: List all skills
export async function GET() {
  try {
    const dbSkills = await prisma.skill.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const skills: Skill[] = dbSkills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      displayName: skill.displayName,
      description: skill.description,
      content: skill.content,
      isEnabled: skill.isEnabled,
      sortOrder: skill.sortOrder,
      createdAt: skill.createdAt.toISOString(),
      updatedAt: skill.updatedAt.toISOString(),
    }));

    return NextResponse.json<SkillsResponse>({ skills });
  } catch (error) {
    console.error('Failed to fetch skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}

// POST: Create a new skill
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SkillCreateRequest;

    // Validate required fields
    if (!body.name || !body.displayName || !body.content) {
      return NextResponse.json(
        { error: 'name, displayName, and content are required' },
        { status: 400 }
      );
    }

    // Sanitize name to be URL-safe
    const sanitizedName = body.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Check for duplicate name
    const existing = await prisma.skill.findUnique({
      where: { name: sanitizedName },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A skill with this name already exists' },
        { status: 409 }
      );
    }

    // Get the next sort order
    const maxSortOrder = await prisma.skill.aggregate({
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSortOrder._max.sortOrder ?? 0) + 1;

    // Create the skill
    const created = await prisma.skill.create({
      data: {
        name: sanitizedName,
        displayName: body.displayName,
        description: body.description || null,
        content: body.content,
        sortOrder: nextSortOrder,
      },
    });

    const skill: Skill = {
      id: created.id,
      name: created.name,
      displayName: created.displayName,
      description: created.description,
      content: created.content,
      isEnabled: created.isEnabled,
      sortOrder: created.sortOrder,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };

    return NextResponse.json(skill, { status: 201 });
  } catch (error) {
    console.error('Failed to create skill:', error);
    return NextResponse.json(
      { error: 'Failed to create skill' },
      { status: 500 }
    );
  }
}
