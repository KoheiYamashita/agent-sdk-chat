import type { PermissionMode } from './chat';

export interface SettingsData {
  general: GeneralSettings;
  permissions: PermissionSettings;
  sandbox: SandboxSettings;
  appearance: AppearanceSettings;
  titleGeneration?: TitleGenerationSettings;
  danger?: DangerSettings;
}

export interface TitleGenerationSettings {
  enabled: boolean;           // Enable/disable auto title generation
  model: string;              // Model ID to use (empty = use first Haiku model)
  prompt: string;             // Prompt template with <chat_history> placeholder
}

export type AvatarIconType = 'user' | 'user-circle' | 'user-round' | 'smile' | 'star' | 'heart' | 'circle-user' | 'initials' | 'image';
export type BotIconType = 'bot' | 'brain' | 'sparkles' | 'cpu' | 'zap' | 'wand' | 'message-circle' | 'initials' | 'image';
export type FaviconType = 'robot' | 'bot' | 'brain' | 'sparkles' | 'cpu' | 'zap' | 'code' | 'terminal' | 'custom';

export interface AppearanceSettings {
  userIcon: AvatarIconType;
  userInitials: string;
  userImageUrl: string;
  userName: string;
  botIcon: BotIconType;
  botInitials: string;
  botImageUrl: string;
  favicon: FaviconType;
  customFaviconUrl: string;
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
  workspacePath: string;
  claudeMdTemplate?: string;
}

export interface DangerSettings {
  showUsage: boolean;
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
