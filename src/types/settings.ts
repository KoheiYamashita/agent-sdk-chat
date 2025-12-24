import type { PermissionMode } from './chat';

export interface SettingsData {
  general: GeneralSettings;
  permissions: PermissionSettings;
  sandbox: SandboxSettings;
}

export interface GeneralSettings {
  defaultModel: string;
  defaultPermissionMode: PermissionMode;
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en';
}

export interface PermissionSettings {
  mode: PermissionMode;
  allowedTools: string[];
  disallowedTools: string[];
}

export interface SandboxSettings {
  enabled: boolean;
  autoAllowBash: boolean;
  networkRestrictions: boolean;
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
