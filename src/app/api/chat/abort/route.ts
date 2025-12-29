import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/claude/session-manager';
import { approvalManager } from '@/lib/approval-manager';
import type { AbortRequest } from '@/types';

interface AbortResponseWithInterrupted {
  success: boolean;
  message?: string;
  interruptedApprovalIds?: string[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AbortRequest;
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json<AbortResponseWithInterrupted>(
        { success: false, message: 'sessionId is required' },
        { status: 400 }
      );
    }

    console.log(`[Abort API] Received abort request for session ${sessionId}`);

    // まず待機中の承認リクエストを中断
    const interruptedApprovalIds = approvalManager.interruptAllForSession(sessionId);
    if (interruptedApprovalIds.length > 0) {
      console.log(`[Abort API] Interrupted ${interruptedApprovalIds.length} pending approvals`);
    }

    const success = await sessionManager.interruptQuery(sessionId);

    if (!success && interruptedApprovalIds.length === 0) {
      return NextResponse.json<AbortResponseWithInterrupted>(
        { success: false, message: 'No active query found for this session' },
        { status: 404 }
      );
    }

    return NextResponse.json<AbortResponseWithInterrupted>({
      success: true,
      interruptedApprovalIds,
    });
  } catch (error) {
    console.error('[Abort API] Error:', error);
    return NextResponse.json<AbortResponseWithInterrupted>(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
