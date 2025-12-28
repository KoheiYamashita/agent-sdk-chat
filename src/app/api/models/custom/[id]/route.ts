import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { CustomModel, CustomModelUpdateRequest } from '@/types';

type Params = Promise<{ id: string }>;

// GET: Get a single custom model
export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params;

    const dbModel = await prisma.customModel.findUnique({
      where: { id },
    });

    if (!dbModel) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const model: CustomModel = {
      id: dbModel.id,
      name: dbModel.name,
      displayName: dbModel.displayName,
      baseModel: dbModel.baseModel,
      systemPrompt: dbModel.systemPrompt,
      description: dbModel.description,
      icon: dbModel.icon,
      iconColor: dbModel.iconColor,
      iconImageUrl: dbModel.iconImageUrl,
      isEnabled: dbModel.isEnabled,
      sortOrder: dbModel.sortOrder,
      createdAt: dbModel.createdAt.toISOString(),
      updatedAt: dbModel.updatedAt.toISOString(),
    };

    return NextResponse.json(model);
  } catch (error) {
    console.error('Failed to fetch custom model:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom model' },
      { status: 500 }
    );
  }
}

// PUT: Update a custom model
export async function PUT(request: Request, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as CustomModelUpdateRequest;

    // Check if model exists
    const existing = await prisma.customModel.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // If name is being changed, sanitize and check for duplicates
    let sanitizedName = existing.name;
    if (body.name && body.name !== existing.name) {
      sanitizedName = body.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const duplicate = await prisma.customModel.findFirst({
        where: {
          name: sanitizedName,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A model with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: {
      name?: string;
      displayName?: string;
      baseModel?: string;
      systemPrompt?: string | null;
      description?: string | null;
      icon?: string | null;
      iconColor?: string | null;
      iconImageUrl?: string | null;
      isEnabled?: boolean;
      sortOrder?: number;
    } = {};

    if (body.name) updateData.name = sanitizedName;
    if (body.displayName) updateData.displayName = body.displayName;
    if (body.baseModel) updateData.baseModel = body.baseModel;
    if (body.systemPrompt !== undefined)
      updateData.systemPrompt = body.systemPrompt;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.iconColor !== undefined) updateData.iconColor = body.iconColor;
    if (body.iconImageUrl !== undefined) updateData.iconImageUrl = body.iconImageUrl;
    if (body.isEnabled !== undefined) updateData.isEnabled = body.isEnabled;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

    const updated = await prisma.customModel.update({
      where: { id },
      data: updateData,
    });

    const model: CustomModel = {
      id: updated.id,
      name: updated.name,
      displayName: updated.displayName,
      baseModel: updated.baseModel,
      systemPrompt: updated.systemPrompt,
      description: updated.description,
      icon: updated.icon,
      iconColor: updated.iconColor,
      iconImageUrl: updated.iconImageUrl,
      isEnabled: updated.isEnabled,
      sortOrder: updated.sortOrder,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return NextResponse.json(model);
  } catch (error) {
    console.error('Failed to update custom model:', error);
    return NextResponse.json(
      { error: 'Failed to update custom model' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a custom model
export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { id } = await params;

    // Check if model exists
    const existing = await prisma.customModel.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    await prisma.customModel.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete custom model:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom model' },
      { status: 500 }
    );
  }
}
