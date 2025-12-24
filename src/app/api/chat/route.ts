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
  tool_use_id?: string;
  content?: string | ContentBlock[];
}

// Helper to get allowed tools from session
function parseAllowedTools(allowedToolsJson: string | null): Set<string> {
  if (!allowedToolsJson) return new Set<string>();
  try {
    const tools = JSON.parse(allowedToolsJson) as string[];
    return new Set(tools);
  } catch {
    return new Set<string>();
  }
}

// Helper to save allowed tools to session
async function saveAllowedTools(sessionId: string, tools: Set<string>): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { allowedTools: JSON.stringify([...tools]) },
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;
  const { message, sessionId, settings } = body;

  // Get or create session
  const session = sessionId
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
      let isControllerClosed = false;
      const sendEvent = (event: ChatEvent) => {
        if (isControllerClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          isControllerClosed = true;
        }
      };

      try {
        // Get session-scoped always-allowed tools from DB
        const alwaysAllowedTools = parseAllowedTools(session.allowedTools);

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
              // Save to DB
              await saveAllowedTools(session.id, alwaysAllowedTools);
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
        const toolCalls: Array<{
          id: string;
          name: string;
          input: unknown;
          status: 'running' | 'completed';
          output?: unknown;
        }> = [];

        for await (const msg of query(queryOptions)) {
          const events = processSDKMessage(msg);
          for (const event of events) {
            sendEvent(event);

            // Accumulate tool calls for persistence
            if (event.type === 'tool_use') {
              toolCalls.push({
                id: event.toolUseId,
                name: event.toolName,
                input: event.toolInput,
                status: 'running',
              });
            } else if (event.type === 'tool_result') {
              const existingTool = toolCalls.find(tc => tc.id === event.toolUseId);
              if (existingTool) {
                existingTool.status = 'completed';
                existingTool.output = event.result;
              }
            }
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

          // Accumulate assistant content (append, don't overwrite)
          if (msg.type === 'assistant') {
            const content = msg.message.content as ContentBlock[];
            const textContent = content
              .filter((c: ContentBlock) => c.type === 'text' && c.text)
              .map((c: ContentBlock) => c.text!)
              .join('');
            if (textContent) {
              // Append with separator if there's existing content
              assistantContent = assistantContent
                ? assistantContent + '\n\n' + textContent
                : textContent;
            }
          }

          // Save final result
          if (msg.type === 'result' && 'result' in msg) {
            // Use assistantContent for DB (text only, no tool results)
            // msg.result contains tool results mixed in, which we store separately in toolCalls
            // Only use msg.result as fallback if no tools were used (pure text response)
            const resultContent = toolCalls.length > 0
              ? assistantContent  // Tool execution: use accumulated text only
              : (assistantContent || msg.result);  // No tools: allow msg.result fallback

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
                toolCalls: toolCalls.length > 0 ? JSON.stringify(toolCalls) : null,
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

function processSDKMessage(msg: SDKMessage): ChatEvent[] {
  const events: ChatEvent[] = [];

  switch (msg.type) {
    case 'assistant': {
      const content = msg.message.content as ContentBlock[];
      const textContent = content
        .filter((c: ContentBlock) => c.type === 'text' && c.text)
        .map((c: ContentBlock) => c.text!)
        .join('');

      if (textContent) {
        events.push({ type: 'message', content: textContent, role: 'assistant' });
      }

      // Check for tool use
      const toolUses = content.filter(
        (c: ContentBlock) => c.type === 'tool_use' && c.id && c.name
      );

      for (const toolUse of toolUses) {
        events.push({
          type: 'tool_use',
          toolName: toolUse.name!,
          toolInput: toolUse.input,
          toolUseId: toolUse.id!,
        });
      }
      break;
    }

    case 'user': {
      // Check for tool results
      const content = msg.message.content as ContentBlock[];
      const toolResults = content.filter(
        (c: ContentBlock) => c.type === 'tool_result' && c.tool_use_id
      );

      for (const toolResult of toolResults) {
        // Extract result content
        let resultContent: unknown;
        if (typeof toolResult.content === 'string') {
          resultContent = toolResult.content;
        } else if (Array.isArray(toolResult.content)) {
          // Handle array of content blocks
          resultContent = toolResult.content
            .filter((c: ContentBlock) => c.type === 'text' && c.text)
            .map((c: ContentBlock) => c.text)
            .join('');
        } else {
          resultContent = toolResult.content;
        }

        events.push({
          type: 'tool_result',
          toolName: '', // Tool name not available in result
          result: resultContent,
          toolUseId: toolResult.tool_use_id!,
        });
      }
      break;
    }

    case 'result':
      // Handled separately
      break;
  }

  return events;
}
