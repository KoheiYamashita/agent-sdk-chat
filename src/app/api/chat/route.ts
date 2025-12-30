import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { prisma } from '@/lib/db/prisma';
import { approvalManager } from '@/lib/approval-manager';
import { sessionManager } from '@/lib/claude/session-manager';
import { generateUUID } from '@/lib/utils/uuid';
import { getAllToolNames, getDangerousToolNames } from '@/lib/constants/tools';
import { DEFAULT_TITLE_GENERATION } from '@/lib/constants/title-generation';
import { DEFAULT_WORKSPACE_CLAUDE_MD } from '@/lib/constants/workspace-claude-md';
import { resolveSkillEnabled } from '@/types/skills';
import { generateSessionTitle } from '@/lib/claude/title-generator';
import type { ChatRequest, ChatEvent, MessageUsage, ToolApprovalRequest, SandboxSettings, Skill, SkillSettings, TitleGenerationSettings } from '@/types';

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

// Helper to write CLAUDE.md to workspace if it doesn't exist
async function writeClaudeMdToWorkspace(
  workspacePath: string,
  template: string
): Promise<void> {
  const claudeMdPath = path.join(workspacePath, 'CLAUDE.md');
  try {
    await fs.access(claudeMdPath);
    // File exists, skip creation to preserve user modifications
  } catch {
    // File doesn't exist, create it
    await fs.writeFile(claudeMdPath, template, 'utf-8');
    console.log('[Chat] Created CLAUDE.md in workspace:', claudeMdPath);
  }
}

// File path parameter names used by various tools
const FILE_PATH_PARAMS = ['file_path', 'path', 'notebook_path', 'filePath'];

// Tools that operate on files and should have paths normalized
const FILE_TOOLS = [
  'Edit',
  'Write',
  'Read',
  'NotebookEdit',
  'NotebookRead',
  'Glob',
  'Grep',
  'LSP',
];

// Helper to check if a path is within workspace
function isPathWithinWorkspace(targetPath: string, workspacePath: string): boolean {
  const normalizedTarget = path.normalize(targetPath);
  const normalizedWorkspace = path.normalize(workspacePath);
  // Check exact match or starts with workspace + separator
  return normalizedTarget === normalizedWorkspace ||
         normalizedTarget.startsWith(normalizedWorkspace + path.sep);
}

// Helper to normalize file paths in tool input to be within workspace
function normalizeToolInput(
  toolName: string,
  input: Record<string, unknown>,
  workspacePath: string
): { normalizedInput: Record<string, unknown>; wasModified: boolean } {
  // Only process file-related tools
  if (!FILE_TOOLS.includes(toolName)) {
    return { normalizedInput: input, wasModified: false };
  }

  const normalizedInput = { ...input };
  let wasModified = false;

  for (const paramName of FILE_PATH_PARAMS) {
    const filePath = input[paramName];
    if (typeof filePath !== 'string') continue;

    // Resolve path: absolute paths stay as-is, relative paths are resolved against workspace
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(workspacePath, filePath);

    // Check if resolved path is outside workspace
    if (!isPathWithinWorkspace(resolvedPath, workspacePath)) {
      // Extract filename and place it in workspace
      const fileName = path.basename(filePath);
      const newPath = path.join(workspacePath, fileName);
      normalizedInput[paramName] = newPath;
      wasModified = true;
      console.log(`[Chat] Normalized path: ${filePath} -> ${newPath}`);
    }
  }

  return { normalizedInput, wasModified };
}

// Default approval timeout (60 minutes)
const DEFAULT_APPROVAL_TIMEOUT_MINUTES = 60;

// Helper to get approval timeout in milliseconds
async function getApprovalTimeoutMs(): Promise<number> {
  const settings = await prisma.settings.findUnique({ where: { key: 'general' } });
  if (!settings) return DEFAULT_APPROVAL_TIMEOUT_MINUTES * 60 * 1000;
  try {
    const general = JSON.parse(settings.value) as { approvalTimeoutMinutes?: number };
    const minutes = general.approvalTimeoutMinutes ?? DEFAULT_APPROVAL_TIMEOUT_MINUTES;
    return minutes * 60 * 1000; // 0分の場合は0msを返す（無制限）
  } catch {
    return DEFAULT_APPROVAL_TIMEOUT_MINUTES * 60 * 1000;
  }
}

// Helper to get title generation settings
async function getTitleGenerationSettings(): Promise<TitleGenerationSettings> {
  const settings = await prisma.settings.findUnique({ where: { key: 'titleGeneration' } });
  if (!settings) return DEFAULT_TITLE_GENERATION;
  try {
    return JSON.parse(settings.value) as TitleGenerationSettings;
  } catch {
    return DEFAULT_TITLE_GENERATION;
  }
}

// Helper to write enabled skills to workspace
async function writeSkillsToWorkspace(
  workspacePath: string,
  skills: Skill[],
  customModelSkillSettings: SkillSettings | null,
  sessionSkillSettings: SkillSettings | null
): Promise<void> {
  const skillsDir = path.join(workspacePath, '.claude', 'skills');

  // Get list of skill names that should be enabled
  const enabledSkillNames = new Set<string>();
  for (const skill of skills) {
    const resolved = resolveSkillEnabled(skill, customModelSkillSettings, sessionSkillSettings);
    if (resolved.isEnabled) {
      enabledSkillNames.add(skill.name);
    }
  }

  // Ensure .claude/skills directory exists
  await fs.mkdir(skillsDir, { recursive: true });

  // Write enabled skills
  for (const skill of skills) {
    if (enabledSkillNames.has(skill.name)) {
      const skillDir = path.join(skillsDir, skill.name);
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skill.content, 'utf-8');
    }
  }

  // Remove disabled skills that might exist from previous runs
  try {
    const existingDirs = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const dirent of existingDirs) {
      if (dirent.isDirectory() && !enabledSkillNames.has(dirent.name)) {
        // This skill directory should not exist, remove it
        await fs.rm(path.join(skillsDir, dirent.name), { recursive: true, force: true });
      }
    }
  } catch {
    // If reading directory fails (e.g., doesn't exist), that's fine
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;
  const { message, sessionId, settings } = body;

  // Get or create session
  // Track if this is a new session for title generation
  const isNewSession = !sessionId;
  const session = sessionId
    ? await prisma.session.findUnique({ where: { id: sessionId } })
    : await prisma.session.create({
        data: {
          title: message.slice(0, 50),
          isAutoGeneratedTitle: true,  // Mark as auto-generated initially
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

      // 中断フラグ（catchブロックでエラー表示を抑制するために使用）
      let wasInterrupted = false;

      // Start title generation in parallel for new sessions
      // This runs concurrently with the main chat query
      if (isNewSession) {
        (async () => {
          try {
            const titleSettings = await getTitleGenerationSettings();
            if (titleSettings.enabled) {
              const generatedTitle = await generateSessionTitle({
                userMessage: message,
                settings: titleSettings,
              });
              if (generatedTitle) {
                await prisma.session.update({
                  where: { id: session.id },
                  data: { title: generatedTitle, isAutoGeneratedTitle: true },
                });
                // Send title_updated event to client
                sendEvent({
                  type: 'title_updated',
                  sessionId: session.id,
                  title: generatedTitle,
                });
                console.log(`[Chat] Generated title for session ${session.id}: ${generatedTitle}`);
              }
            }
          } catch (titleError) {
            console.error('[Chat] Failed to generate title:', titleError);
          }
        })();
      }

      try {
        // Get session-scoped always-allowed tools from DB
        const alwaysAllowedTools = parseAllowedTools(session.allowedTools);
        // Get globally allowed tools from settings
        const globalAllowedTools = await getGlobalAllowedTools();
        // Get sandbox settings
        const sandboxSettings = await getSandboxSettings();
        // Get approval timeout setting
        const approvalTimeoutMs = await getApprovalTimeoutMs();

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

        // Create workspace directory if it doesn't exist
        await fs.mkdir(workspacePath, { recursive: true });

        // Create CLAUDE.md in workspace if it doesn't exist
        const claudeMdTemplate = sandboxSettings.claudeMdTemplate ?? DEFAULT_WORKSPACE_CLAUDE_MD;
        await writeClaudeMdToWorkspace(workspacePath, claudeMdTemplate);

        // Fetch and write enabled skills to workspace
        const allSkills = await prisma.skill.findMany({
          orderBy: { sortOrder: 'asc' },
        });

        // Get custom model skill settings if using a custom model
        let customModelSkillSettings: SkillSettings | null = null;
        if (settings?.modelDisplayName) {
          const customModel = await prisma.customModel.findFirst({
            where: { displayName: settings.modelDisplayName },
          });
          if (customModel?.skillSettings) {
            try {
              customModelSkillSettings = JSON.parse(customModel.skillSettings) as SkillSettings;
            } catch {
              // Invalid JSON, ignore
            }
          }
        }

        // Get session skill settings from request
        const sessionSkillSettings: SkillSettings | null = settings?.skillSettings ?? null;

        // Write skills to workspace if we have skills
        const hasSkills = allSkills.length > 0;
        if (hasSkills) {
          const dbSkills: Skill[] = allSkills.map((s) => ({
            id: s.id,
            name: s.name,
            displayName: s.displayName,
            description: s.description,
            content: s.content,
            isEnabled: s.isEnabled,
            sortOrder: s.sortOrder,
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
          }));
          await writeSkillsToWorkspace(workspacePath, dbSkills, customModelSkillSettings, sessionSkillSettings);
          console.log('[Skills] Wrote skills to:', path.join(workspacePath, '.claude', 'skills'));
          console.log('[Skills] Enabled skills:', dbSkills.filter(s => {
            const resolved = resolveSkillEnabled(s, customModelSkillSettings, sessionSkillSettings);
            return resolved.isEnabled;
          }).map(s => s.name));
        }
        console.log('[Chat] CWD for SDK:', workspacePath);

        // Build the list of auto-allowed tools (global + session + Skill)
        const autoAllowedTools = [
          ...Array.from(globalAllowedTools),
          ...Array.from(alwaysAllowedTools),
          'Skill', // Always allow Skill tool for project skills
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

            // Load project settings for skills, but ignore user/local settings (SDK isolation mode)
            settingSources: ['project'] as ('user' | 'project' | 'local')[],

            // Explicitly specify available tools (overrides SDK defaults)
            tools: getAllToolNames(),

            // Auto-allow tools from global settings + session settings
            // SDK will skip canUseTool for these tools
            allowedTools: autoAllowedTools,

            // Workspace settings
            cwd: workspacePath,

            // Permission handler for tools not in allowedTools
            canUseTool: async (toolName: string, input: Record<string, unknown>) => {
              // Normalize file paths to be within workspace
              const { normalizedInput, wasModified } = normalizeToolInput(toolName, input, workspacePath);
              if (wasModified) {
                console.log(`[Chat] Tool ${toolName} input was normalized to workspace`);
              }

              // Generate unique request ID
              const requestId = generateUUID();

              // Determine if tool is dangerous
              const isDangerous = dangerousToolNames.includes(toolName);

              // Send approval request to client (with normalized input so user sees correct path)
              const approvalRequest: ToolApprovalRequest = {
                requestId,
                toolName,
                toolInput: normalizedInput,
                isDangerous,
              };

              sendEvent({
                type: 'tool_approval_request',
                request: approvalRequest,
              });

              // Wait for client response
              const response = await approvalManager.waitForApproval(
                requestId,
                session.id,
                approvalRequest,
                approvalTimeoutMs
              );

              // Notify client that approval was resolved
              sendEvent({
                type: 'tool_approval_resolved',
                requestId,
                decision: response.decision,
              });

              if (response.decision === 'always') {
                alwaysAllowedTools.add(toolName);
                // Save to DB for future requests in this session
                await saveAllowedTools(session.id, alwaysAllowedTools);
                return { behavior: 'allow' as const, updatedInput: normalizedInput };
              } else if (response.decision === 'allow') {
                return { behavior: 'allow' as const, updatedInput: normalizedInput };
              } else if (response.decision === 'interrupt') {
                // 中断の場合: SDKに通知しつつ、エラー表示を抑制するためにerrorではなくdenyを使用
                // 注: sessionManager.interruptQuery()が同時に呼ばれているので、SDK側で処理が中断される
                wasInterrupted = true;
                return { behavior: 'deny' as const, message: 'Execution interrupted by user' };
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
        let isResultSaved = false; // 二重保存防止フラグ
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

            // Accumulate text content for persistence (中断時にも保存されるように)
            if (event.type === 'text_delta') {
              assistantContent += event.delta;
            }

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

          // Note: Assistant content is now accumulated from text_delta events above
          // This ensures partial content is saved even when interrupted

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
                modelDisplayName: settings?.modelDisplayName || null,
                durationMs: msg.duration_ms,
                thinkingContent: thinkingContent || null,
              },
            });
            isResultSaved = true; // 正常完了時にフラグを立てる

            // Title generation is now done in parallel (see above)

            sendEvent({
              type: 'done',
              result: resultContent,
              usage,
              model: currentModel,
              modelDisplayName: settings?.modelDisplayName || undefined,
              thinkingContent: thinkingContent || undefined,
            });
          }
        }
        } finally {
          // Always unregister the query when done (success or interrupt)
          sessionManager.unregisterQuery(session.id);

          // 停止/エラー時に途中結果をDB保存
          if (!isResultSaved && (assistantContent || toolCalls.length > 0)) {
            try {
              await prisma.message.create({
                data: {
                  sessionId: session.id,
                  role: 'assistant',
                  content: assistantContent || '', // contentは必須なので空文字列を使用
                  toolCalls: toolCalls.length > 0 ? JSON.stringify(toolCalls) : null,
                  model: currentModel,
                  modelDisplayName: settings?.modelDisplayName || null,
                  thinkingContent: thinkingContent || null,
                },
              });
              console.log(`[Chat] Saved partial result for session ${session.id}`);
              // Title generation is done in parallel (see above)
            } catch (saveError) {
              console.error('[Chat] Failed to save partial result:', saveError);
            }
          }
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
        // Ensure query is unregistered on error
        sessionManager.unregisterQuery(session.id);

        // 中断によるエラーは表示しない
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isInterruptError = wasInterrupted ||
          errorMessage.includes('interrupted') ||
          errorMessage.includes('exited with code');

        if (!isInterruptError) {
          console.error('Chat error:', error);
          sendEvent({
            type: 'error',
            message: errorMessage,
          });
        } else {
          console.log('[Chat] Suppressed interrupt-related error:', errorMessage);
        }

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
