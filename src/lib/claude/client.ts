import { query as sdkQuery, type SDKMessage, type Options } from '@anthropic-ai/claude-agent-sdk';
import type { ClaudeQueryOptions, McpServerConfig, AgentDefinition, SandboxConfig } from './types';

export async function* queryWithOptions(
  options: ClaudeQueryOptions
): AsyncGenerator<SDKMessage> {
  const sdkOptions: Options = {
    resume: options.resume,
    model: options.model,
    allowedTools: options.allowedTools,
    disallowedTools: options.disallowedTools,
    permissionMode: options.permissionMode,
    systemPrompt: options.systemPrompt,
    maxTurns: options.maxTurns,
    includePartialMessages: true,
  };

  if (options.mcpServers) {
    sdkOptions.mcpServers = options.mcpServers as Options['mcpServers'];
  }

  if (options.agents) {
    sdkOptions.agents = options.agents as Options['agents'];
  }

  if (options.sandbox) {
    sdkOptions.sandbox = options.sandbox as Options['sandbox'];
  }

  const queryResult = sdkQuery({
    prompt: options.prompt,
    options: sdkOptions,
  });

  for await (const message of queryResult) {
    yield message;
  }
}

export { type SDKMessage, type Options };
export type { ClaudeQueryOptions, McpServerConfig, AgentDefinition, SandboxConfig };
