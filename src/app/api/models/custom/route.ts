import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type {
  CustomModel,
  CustomModelsResponse,
  CustomModelCreateRequest,
} from '@/types';

// GET: List all custom models
export async function GET() {
  try {
    const dbModels = await prisma.customModel.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const models: CustomModel[] = dbModels.map((model) => ({
      id: model.id,
      name: model.name,
      displayName: model.displayName,
      baseModel: model.baseModel,
      systemPrompt: model.systemPrompt,
      description: model.description,
      icon: model.icon,
      iconColor: model.iconColor,
      iconImageUrl: model.iconImageUrl,
      skillSettings: model.skillSettings ? JSON.parse(model.skillSettings) : null,
      isEnabled: model.isEnabled,
      sortOrder: model.sortOrder,
      createdAt: model.createdAt.toISOString(),
      updatedAt: model.updatedAt.toISOString(),
    }));

    return NextResponse.json<CustomModelsResponse>({ models });
  } catch (error) {
    console.error('Failed to fetch custom models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom models' },
      { status: 500 }
    );
  }
}

// POST: Create a new custom model
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CustomModelCreateRequest;

    // Validate required fields
    if (!body.name || !body.displayName || !body.baseModel) {
      return NextResponse.json(
        { error: 'name, displayName, and baseModel are required' },
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
    const existing = await prisma.customModel.findUnique({
      where: { name: sanitizedName },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A model with this name already exists' },
        { status: 409 }
      );
    }

    // Get the next sort order
    const maxSortOrder = await prisma.customModel.aggregate({
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSortOrder._max.sortOrder ?? 0) + 1;

    // Create the model
    const created = await prisma.customModel.create({
      data: {
        name: sanitizedName,
        displayName: body.displayName,
        baseModel: body.baseModel,
        systemPrompt: body.systemPrompt || null,
        description: body.description || null,
        icon: body.icon || null,
        iconColor: body.iconColor || null,
        iconImageUrl: body.iconImageUrl || null,
        skillSettings: body.skillSettings ? JSON.stringify(body.skillSettings) : null,
        sortOrder: nextSortOrder,
      },
    });

    const model: CustomModel = {
      id: created.id,
      name: created.name,
      displayName: created.displayName,
      baseModel: created.baseModel,
      systemPrompt: created.systemPrompt,
      description: created.description,
      icon: created.icon,
      iconColor: created.iconColor,
      iconImageUrl: created.iconImageUrl,
      skillSettings: created.skillSettings ? JSON.parse(created.skillSettings) : null,
      isEnabled: created.isEnabled,
      sortOrder: created.sortOrder,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };

    return NextResponse.json(model, { status: 201 });
  } catch (error) {
    console.error('Failed to create custom model:', error);
    return NextResponse.json(
      { error: 'Failed to create custom model' },
      { status: 500 }
    );
  }
}
