import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Expand assistant messages with toolCalls into multiple messages to match real-time display:
    // 1. tool_approval messages for each tool (showing approval status)
    // 2. Message with toolCalls (showing execution results)
    // 3. Message with content only (the text response)
    const dangerousTools = ['Bash', 'Write', 'Edit', 'KillShell'];

    interface ToolCall {
      id: string;
      name: string;
      input: unknown;
      status: string;
      output?: unknown;
    }

    interface ExpandedMessage {
      id: string;
      role: string;
      content: string;
      toolCalls?: ToolCall[];
      toolApproval?: {
        requestId: string;
        toolName: string;
        toolInput: unknown;
        isDangerous: boolean;
        decision: 'allow' | 'always';
        decidedAt: string;
      };
      metadata?: unknown;
      createdAt: string;
    }

    const expandedMessages: ExpandedMessage[] = [];

    for (const message of session.messages) {
      const toolCalls: ToolCall[] | null = message.toolCalls ? JSON.parse(message.toolCalls) : null;
      const metadata = message.metadata ? JSON.parse(message.metadata) : null;

      if (message.role === 'assistant' && toolCalls && toolCalls.length > 0) {
        // Match real-time display order:
        // 1. toolCalls message (tool_use event creates this first)
        // 2. tool_approval messages (tool_approval_request comes after tool_use)
        // 3. content message (text response comes last)

        // First: toolCalls message (showing execution results)
        expandedMessages.push({
          id: `${message.id}-tools`,
          role: message.role,
          content: '',
          toolCalls,
          createdAt: message.createdAt.toISOString(),
        });

        // Second: tool_approval messages for each tool
        for (const toolCall of toolCalls) {
          expandedMessages.push({
            id: `${message.id}-approval-${toolCall.id}`,
            role: 'tool_approval',
            content: '',
            toolApproval: {
              requestId: toolCall.id,
              toolName: toolCall.name,
              toolInput: toolCall.input,
              isDangerous: dangerousTools.includes(toolCall.name),
              decision: 'allow', // Already executed, so it was allowed
              decidedAt: message.createdAt.toISOString(),
            },
            createdAt: message.createdAt.toISOString(),
          });
        }

        // Finally: content only (if there is content)
        if (message.content) {
          expandedMessages.push({
            id: message.id,
            role: message.role,
            content: message.content,
            metadata,
            createdAt: message.createdAt.toISOString(),
          });
        }
      } else {
        // Regular message, no splitting needed
        expandedMessages.push({
          id: message.id,
          role: message.role,
          content: message.content,
          toolCalls: toolCalls ?? undefined,
          metadata,
          createdAt: message.createdAt.toISOString(),
        });
      }
    }

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        claudeSessionId: session.claudeSessionId,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        settings: session.settings ? JSON.parse(session.settings) : null,
        isArchived: session.isArchived,
      },
      messages: expandedMessages,
    });
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, isArchived, settings } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    if (settings !== undefined) updateData.settings = JSON.stringify(settings);

    const session = await prisma.session.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        claudeSessionId: session.claudeSessionId,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        settings: session.settings ? JSON.parse(session.settings) : null,
        isArchived: session.isArchived,
      },
    });
  } catch (error) {
    console.error('Failed to update session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.session.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
