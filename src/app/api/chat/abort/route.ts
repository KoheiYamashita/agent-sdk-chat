import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/claude/session-manager';
import type { AbortRequest, AbortResponse } from '@/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AbortRequest;
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json<AbortResponse>(
        { success: false, message: 'sessionId is required' },
        { status: 400 }
      );
    }

    console.log(`[Abort API] Received abort request for session ${sessionId}`);

    const success = await sessionManager.interruptQuery(sessionId);

    if (!success) {
      return NextResponse.json<AbortResponse>(
        { success: false, message: 'No active query found for this session' },
        { status: 404 }
      );
    }

    return NextResponse.json<AbortResponse>({ success: true });
  } catch (error) {
    console.error('[Abort API] Error:', error);
    return NextResponse.json<AbortResponse>(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
