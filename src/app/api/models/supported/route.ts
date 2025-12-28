import { NextResponse } from 'next/server';
import { query as sdkQuery } from '@anthropic-ai/claude-agent-sdk';
import type { StandardModel, StandardModelsResponse } from '@/types';

// Cache for supported models (5 minutes)
let cachedModels: StandardModel[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    // Check cache
    if (cachedModels && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return NextResponse.json<StandardModelsResponse>({ models: cachedModels });
    }

    // Create a minimal query to get supported models
    const queryResult = sdkQuery({
      prompt: '',
      options: {
        maxTurns: 0, // Don't run any turns
      },
    });

    // Get supported models from the query object
    const models = await queryResult.supportedModels();

    // Transform to our StandardModel format
    const standardModels: StandardModel[] = models.map((model) => ({
      id: model.value,
      displayName: model.displayName,
      description: model.description,
    }));

    // Cache the results
    cachedModels = standardModels;
    cacheTimestamp = Date.now();

    // Interrupt the query since we don't need to run it
    await queryResult.interrupt();

    return NextResponse.json<StandardModelsResponse>({ models: standardModels });
  } catch (error) {
    console.error('Failed to fetch supported models:', error);

    // Return fallback models if SDK call fails
    const fallbackModels: StandardModel[] = [
      {
        id: 'claude-sonnet-4-20250514',
        displayName: 'Claude 4 Sonnet',
        description: 'Balanced performance and cost',
      },
      {
        id: 'claude-opus-4-5-20251101',
        displayName: 'Claude 4.5 Opus',
        description: 'Most capable model',
      },
      {
        id: 'claude-3-5-haiku-20241022',
        displayName: 'Claude 3.5 Haiku',
        description: 'Fast and cost-effective',
      },
    ];

    return NextResponse.json<StandardModelsResponse>({ models: fallbackModels });
  }
}
