import type { PermissionMode } from './chat';

export interface SettingsData {
  general: GeneralSettings;
  permissions: PermissionSettings;
  sandbox: SandboxSettings;
  appearance: AppearanceSettings;
}

export type AvatarIconType = 'user' | 'user-circle' | 'user-round' | 'smile' | 'star' | 'heart' | 'circle-user' | 'initials' | 'image';
export type BotIconType = 'bot' | 'brain' | 'sparkles' | 'cpu' | 'zap' | 'wand' | 'message-circle' | 'initials' | 'image';

export interface AppearanceSettings {
  userIcon: AvatarIconType;
  userInitials: string;
  userImageUrl: string;
  userName: string;
  botIcon: BotIconType;
  botInitials: string;
  botImageUrl: string;
}

export interface GeneralSettings {
  defaultModel: string;
  defaultPermissionMode: PermissionMode;
  defaultThinkingEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en';
  approvalTimeoutMinutes: number; // デフォルト60、0で無制限
}

export interface PermissionSettings {
  mode: PermissionMode;
  allowedTools: string[];
  disallowedTools: string[];
}

export interface SandboxSettings {
  enabled: boolean;
  workspacePath: string;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  type: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  isEnabled: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  prompt: string;
  tools?: string[];
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  isEnabled: boolean;
}

export interface ToolInfo {
  name: string;
  description: string;
  isEnabled: boolean;
}

export interface MCPToolInfo {
  serverName: string;
  tools: {
    name: string;
    description: string;
    inputSchema: object;
  }[];
}

export interface ToolsResponse {
  builtinTools: ToolInfo[];
  mcpTools: MCPToolInfo[];
}
