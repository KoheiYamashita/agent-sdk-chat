import { NextResponse } from 'next/server';
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { prisma } from '@/lib/db/prisma';
import { approvalManager } from '@/lib/approval-manager';
import { generateUUID } from '@/lib/utils/uuid';
import type { ChatRequest, ChatEvent, MessageMetadata, ToolApprovalRequest } from '@/types';

interface ContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;
  const { message, sessionId, settings } = body;

  // Get or create session
  let session = sessionId
    ? await prisma.session.findUnique({ where: { id: sessionId } })
    : await prisma.session.create({
        data: { title: message.slice(0, 50) },
      });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Save user message
  await prisma.message.create({
    data: {
      sessionId: session.id,
      role: 'user',
      content: message,
    },
  });

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: ChatEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        // Session-scoped always-allowed tools (reset on each request for simplicity)
        // In production, you might want to track this per Claude session
        const alwaysAllowedTools = new Set<string>();

        const queryOptions = {
          prompt: message,
          options: {
            resume: session.claudeSessionId ?? undefined,
            model: settings?.model,
            allowedTools: settings?.allowedTools,
            disallowedTools: settings?.disallowedTools,
            permissionMode: settings?.permissionMode ?? 'default',
            systemPrompt: settings?.systemPrompt,
            maxTurns: settings?.maxTurns,
            includePartialMessages: true,
            canUseTool: async (toolName: string, input: Record<string, unknown>) => {
            // Check if tool is always allowed for this session
            if (alwaysAllowedTools.has(toolName)) {
              return { behavior: 'allow' as const, updatedInput: input };
            }

            // Generate unique request ID
            const requestId = generateUUID();

            // Determine if tool is dangerous
            const dangerousTools = ['Bash', 'Write', 'Edit', 'KillShell'];
            const isDangerous = dangerousTools.includes(toolName);

            // Send approval request to client
            const approvalRequest: ToolApprovalRequest = {
              requestId,
              toolName,
              toolInput: input,
              isDangerous,
            };

            sendEvent({
              type: 'tool_approval_request',
              request: approvalRequest,
            });

            // Wait for client response
            const response = await approvalManager.waitForApproval(requestId);

            // Notify client that approval was resolved
            sendEvent({
              type: 'tool_approval_resolved',
              requestId,
            });

            if (response.decision === 'always') {
              alwaysAllowedTools.add(toolName);
              return { behavior: 'allow' as const, updatedInput: input };
            } else if (response.decision === 'allow') {
              return { behavior: 'allow' as const, updatedInput: input };
            } else {
              return { behavior: 'deny' as const, message: 'User denied tool execution' };
            }
          },
          },  // close options
        };  // close queryOptions

        let assistantContent = '';
        let claudeSessionId = session.claudeSessionId;

        for await (const msg of query(queryOptions)) {
          const event = processSDKMessage(msg);
          if (event) {
            sendEvent(event);
          }

          // Capture session ID from init message
          if (msg.type === 'system' && msg.subtype === 'init') {
            claudeSessionId = msg.session_id;

            // Update session with Claude session ID
            if (session.claudeSessionId !== claudeSessionId) {
              await prisma.session.update({
                where: { id: session.id },
                data: { claudeSessionId },
              });
            }

            sendEvent({
              type: 'init',
              sessionId: session.id,
              claudeSessionId: claudeSessionId,
            });
          }

          // Accumulate assistant content
          if (msg.type === 'assistant') {
            const content = msg.message.content as ContentBlock[];
            const textContent = content
              .filter((c: ContentBlock) => c.type === 'text' && c.text)
              .map((c: ContentBlock) => c.text!)
              .join('');
            assistantContent = textContent;
          }

          // Save final result
          if (msg.type === 'result' && 'result' in msg) {
            const resultContent = msg.result || assistantContent;

            const usage: MessageMetadata['usage'] = {
              input_tokens: msg.usage.input_tokens,
              output_tokens: msg.usage.output_tokens,
              cache_creation_input_tokens: msg.usage.cache_creation_input_tokens,
              cache_read_input_tokens: msg.usage.cache_read_input_tokens,
            };

            await prisma.message.create({
              data: {
                sessionId: session.id,
                role: 'assistant',
                content: resultContent,
                metadata: JSON.stringify({
                  usage,
                  cost: msg.total_cost_usd,
                  duration_ms: msg.duration_ms,
                }),
              },
            });

            // Update session title if it's still the default
            if (session.title === '新規チャット' || session.title === message.slice(0, 50)) {
              const newTitle = message.slice(0, 50);
              await prisma.session.update({
                where: { id: session.id },
                data: { title: newTitle },
              });
            }

            sendEvent({
              type: 'done',
              result: resultContent,
              usage,
            });
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Chat error:', error);
        sendEvent({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function processSDKMessage(msg: SDKMessage): ChatEvent | null {
  switch (msg.type) {
    case 'assistant': {
      const content = msg.message.content as ContentBlock[];
      const textContent = content
        .filter((c: ContentBlock) => c.type === 'text' && c.text)
        .map((c: ContentBlock) => c.text!)
        .join('');

      if (textContent) {
        return { type: 'message', content: textContent, role: 'assistant' };
      }

      // Check for tool use
      const toolUse = content.find(
        (c: ContentBlock) => c.type === 'tool_use' && c.id && c.name
      );

      if (toolUse) {
        return {
          type: 'tool_use',
          toolName: toolUse.name!,
          toolInput: toolUse.input,
          toolUseId: toolUse.id!,
        };
      }

      return null;
    }

    case 'result':
      // Handled separately
      return null;

    default:
      return null;
  }
}
