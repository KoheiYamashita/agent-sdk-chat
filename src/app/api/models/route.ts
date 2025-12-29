import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { AllModelsResponse, StandardModel, CustomModel } from '@/types';

export async function GET() {
  try {
    // Fetch standard models from the supported API
    const supportedResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/models/supported`
    );
    const { models: standardModels } = (await supportedResponse.json()) as {
      models: StandardModel[];
    };

    // Fetch custom models from database
    const dbCustomModels = await prisma.customModel.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: 'asc' },
    });

    const customModels: CustomModel[] = dbCustomModels.map((model) => ({
      id: model.id,
      name: model.name,
      displayName: model.displayName,
      baseModel: model.baseModel,
      systemPrompt: model.systemPrompt,
      description: model.description,
      icon: model.icon,
      iconColor: model.iconColor,
      iconImageUrl: model.iconImageUrl,
      isEnabled: model.isEnabled,
      sortOrder: model.sortOrder,
      skillSettings: model.skillSettings ? JSON.parse(model.skillSettings) : null,
      createdAt: model.createdAt.toISOString(),
      updatedAt: model.updatedAt.toISOString(),
    }));

    return NextResponse.json<AllModelsResponse>({
      standardModels,
      customModels,
    });
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
