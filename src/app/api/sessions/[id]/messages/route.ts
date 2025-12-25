import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const DEFAULT_PAGE_SIZE = 30;
const DANGEROUS_TOOLS = ['Bash', 'Write', 'Edit', 'KillShell'];

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

function expandMessage(message: {
  id: string;
  role: string;
  content: string;
  toolCalls: string | null;
  metadata: string | null;
  createdAt: Date;
}): ExpandedMessage[] {
  const toolCalls: ToolCall[] | null = message.toolCalls
    ? JSON.parse(message.toolCalls)
    : null;
  const metadata = message.metadata ? JSON.parse(message.metadata) : null;
  const expandedMessages: ExpandedMessage[] = [];

  if (message.role === 'assistant' && toolCalls && toolCalls.length > 0) {
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
          isDangerous: DANGEROUS_TOOLS.includes(toolCall.name),
          decision: 'allow',
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

  return expandedMessages;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10),
      100
    );

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get total message count
    const total = await prisma.message.count({
      where: { sessionId: id },
    });

    // Fetch messages with cursor-based pagination (from newest to oldest)
    // We fetch from the end and go backwards
    const messages = await prisma.message.findMany({
      where: { sessionId: id },
      take: -(limit + 1), // Negative to get from end, +1 to check for more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
      }),
      orderBy: { createdAt: 'asc' },
    });

    // Check if there are more (older) messages
    const hasMore = messages.length > limit;
    const messagesToReturn = hasMore ? messages.slice(1) : messages;
    const nextCursor = hasMore ? messagesToReturn[0]?.id : null;

    // Sort messages by createdAt ascending (oldest first)
    // Prisma with negative take returns in reverse order
    messagesToReturn.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Expand messages for display
    const expandedMessages = messagesToReturn.flatMap(expandMessage);

    return NextResponse.json({
      messages: expandedMessages,
      total,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
