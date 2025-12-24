import { NextResponse } from 'next/server';
import { approvalManager } from '@/lib/approval-manager';
import type { ToolApprovalResponse } from '@/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ToolApprovalResponse;
    const { requestId, decision } = body;

    if (!requestId || !decision) {
      return NextResponse.json(
        { error: 'Missing requestId or decision' },
        { status: 400 }
      );
    }

    if (!['allow', 'deny', 'always'].includes(decision)) {
      return NextResponse.json(
        { error: 'Invalid decision. Must be allow, deny, or always' },
        { status: 400 }
      );
    }

    const resolved = approvalManager.resolveApproval(requestId, { requestId, decision });

    if (!resolved) {
      return NextResponse.json(
        { error: 'Approval request not found or expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Approve API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
