import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { prisma } from '@/lib/db/prisma';
import { approvalManager } from '@/lib/approval-manager';
import { sessionManager } from '@/lib/claude/session-manager';
import { generateUUID } from '@/lib/utils/uuid';
import { getAllToolNames, getDangerousToolNames } from '@/lib/constants/tools';
import type { ChatRequest, ChatEvent, MessageUsage, ToolApprovalRequest, SandboxSettings } from '@/types';

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

// Helper to get globally allowed tools from settings
async function getGlobalAllowedTools(): Promise<Set<string>> {
  const settings = await prisma.settings.findUnique({ where: { key: 'permissions' } });
  if (!settings) return new Set<string>();
  try {
    const permissions = JSON.parse(settings.value) as { allowedTools?: string[] };
    return new Set(permissions.allowedTools ?? []);
  } catch {
    return new Set<string>();
  }
}

// Default sandbox settings
const DEFAULT_SANDBOX_SETTINGS: SandboxSettings = {
  enabled: true,
  workspacePath: './workspace',
};

// Helper to get sandbox settings
async function getSandboxSettings(): Promise<SandboxSettings> {
  const settings = await prisma.settings.findUnique({ where: { key: 'sandbox' } });
  if (!settings) return DEFAULT_SANDBOX_SETTINGS;
  try {
    return JSON.parse(settings.value) as SandboxSettings;
  } catch {
    return DEFAULT_SANDBOX_SETTINGS;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;
  const { message, sessionId, settings } = body;

  // Get or create session
  const session = sessionId
    ? await prisma.session.findUnique({ where: { id: sessionId } })
    : await prisma.session.create({
        data: {
          title: message.slice(0, 50),
          settings: settings?.workspacePath
            ? JSON.stringify({
                workspacePath: settings.workspacePath,
                workspaceDisplayPath: settings.workspaceDisplayPath,
              })
            : null,
        },
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
        // Get globally allowed tools from settings
        const globalAllowedTools = await getGlobalAllowedTools();
        // Get sandbox settings
        const sandboxSettings = await getSandboxSettings();

        // Determine the effective workspace path:
        // 1. Use session-specific workspacePath from request if provided
        // 2. Fall back to global sandbox settings
        const requestedWorkspacePath = settings?.workspacePath;
        const baseWorkspacePath = sandboxSettings.workspacePath.startsWith('/')
          ? sandboxSettings.workspacePath
          : path.resolve(process.cwd(), sandboxSettings.workspacePath);

        // If session-specific workspace is provided, resolve it relative to base workspace
        let workspacePath: string;
        if (requestedWorkspacePath && requestedWorkspacePath !== '.') {
          workspacePath = path.resolve(baseWorkspacePath, requestedWorkspacePath);
          // Security check: ensure it's still within base workspace
          if (!workspacePath.startsWith(baseWorkspacePath)) {
            workspacePath = baseWorkspacePath;
          }
        } else {
          workspacePath = baseWorkspacePath;
        }

        // Create workspace directory if it doesn't exist (when sandbox is enabled)
        if (sandboxSettings.enabled) {
          await fs.mkdir(workspacePath, { recursive: true });
        }

        // Build the list of auto-allowed tools (global + session)
        const autoAllowedTools = [
          ...Array.from(globalAllowedTools),
          ...Array.from(alwaysAllowedTools),
        ];

        // Get dangerous tool names for UI display
        const dangerousToolNames = getDangerousToolNames();

        // Thinking settings: thinkingEnabled controls maxThinkingTokens
        // If thinkingEnabled is true, set a reasonable max (10000 tokens)
        // If false or undefined, disable thinking (0 tokens)
        const thinkingEnabled = settings?.thinkingEnabled ?? false;
        const maxThinkingTokens = thinkingEnabled ? 10000 : 0;

        const queryOptions = {
          prompt: message,
          options: {
            resume: session.claudeSessionId ?? undefined,
            model: settings?.model,
            systemPrompt: settings?.systemPrompt,
            maxTurns: settings?.maxTurns,
            includePartialMessages: true,

            // Thinking tokens (0 = disabled)
            maxThinkingTokens,

            // Explicitly ignore CLI settings files (SDK isolation mode)
            settingSources: [] as ('user' | 'project' | 'local')[],

            // Explicitly specify available tools (overrides SDK defaults)
            tools: getAllToolNames(),

            // Auto-allow tools from global settings + session settings
            // SDK will skip canUseTool for these tools
            allowedTools: autoAllowedTools,

            // Sandbox and workspace settings
            cwd: sandboxSettings.enabled ? workspacePath : undefined,
            sandbox: sandboxSettings.enabled
              ? {
                  enabled: true,
                  network: {
                    allowedDomains: [], // Empty array = no network restrictions (WebFetch/WebSearch can access any domain)
                  },
                }
              : undefined,

            // Permission handler for tools not in allowedTools
            canUseTool: async (toolName: string, input: Record<string, unknown>) => {
              // Generate unique request ID
              const requestId = generateUUID();

              // Determine if tool is dangerous
              const isDangerous = dangerousToolNames.includes(toolName);

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
                // Save to DB for future requests in this session
                await saveAllowedTools(session.id, alwaysAllowedTools);
                return { behavior: 'allow' as const, updatedInput: input };
              } else if (response.decision === 'allow') {
                return { behavior: 'allow' as const, updatedInput: input };
              } else {
                return { behavior: 'deny' as const, message: 'User denied tool execution' };
              }
            },
          },
        };

        let assistantContent = '';
        let thinkingContent = '';
        let claudeSessionId = session.claudeSessionId;
        let currentModel: string | undefined;
        const toolCalls: Array<{
          id: string;
          name: string;
          input: unknown;
          status: 'running' | 'completed';
          output?: unknown;
        }> = [];

        // Create query and register it for potential interruption
        const queryResult = query(queryOptions);
        sessionManager.registerQuery(session.id, queryResult);

        try {
        for await (const msg of queryResult) {
          const events = processSDKMessage(msg);
          for (const event of events) {
            sendEvent(event);

            // Accumulate thinking content for persistence
            if (event.type === 'thinking_delta') {
              thinkingContent += event.delta;
            }

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

          // Capture session ID and model from init message
          if (msg.type === 'system' && msg.subtype === 'init') {
            claudeSessionId = msg.session_id;
            currentModel = msg.model;

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
              model: currentModel,
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

            const usage: MessageUsage = {
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
                // Usage & metadata in dedicated columns
                inputTokens: usage.input_tokens,
                outputTokens: usage.output_tokens,
                cacheCreationInputTokens: usage.cache_creation_input_tokens,
                cacheReadInputTokens: usage.cache_read_input_tokens,
                cost: msg.total_cost_usd,
                model: currentModel,
                durationMs: msg.duration_ms,
                thinkingContent: thinkingContent || null,
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
              model: currentModel,
              thinkingContent: thinkingContent || undefined,
            });
          }
        }
        } finally {
          // Always unregister the query when done (success or interrupt)
          sessionManager.unregisterQuery(session.id);
        }

        if (!isControllerClosed) {
          try {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            isControllerClosed = true;
          } catch {
            // Controller may already be closed by client disconnect
          }
        }
      } catch (error) {
        console.error('Chat error:', error);
        // Ensure query is unregistered on error
        sessionManager.unregisterQuery(session.id);
        sendEvent({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        if (!isControllerClosed) {
          try {
            controller.close();
            isControllerClosed = true;
          } catch {
            // Controller may already be closed
          }
        }
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

interface StreamEvent {
  type: string;
  delta?: {
    type: string;
    text?: string;
    thinking?: string;
  };
}

function processSDKMessage(msg: SDKMessage): ChatEvent[] {
  const events: ChatEvent[] = [];

  switch (msg.type) {
    case 'stream_event': {
      // Handle streaming events for real-time text and thinking display
      const event = msg.event as StreamEvent;
      if (event.type === 'content_block_delta') {
        if (event.delta?.type === 'text_delta' && event.delta.text) {
          events.push({ type: 'text_delta', delta: event.delta.text });
        } else if (event.delta?.type === 'thinking_delta' && event.delta.thinking) {
          events.push({ type: 'thinking_delta', delta: event.delta.thinking });
        }
      }
      break;
    }

    case 'assistant': {
      // Text content is already sent via text_delta events from stream_event
      // Here we only handle tool_use events
      const content = msg.message.content as ContentBlock[];

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
