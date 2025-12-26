export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool_approval';
  content: string;
  toolCalls?: ToolCall[];
  metadata?: MessageMetadata;
  toolApproval?: ToolApprovalInfo;
  createdAt: string;
}

/** ツール承認履歴 */
export interface ToolApprovalInfo {
  requestId: string;
  toolName: string;
  toolInput: unknown;
  isDangerous: boolean;
  decision?: 'allow' | 'deny' | 'always';
  decidedAt?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
  output?: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface MessageMetadata {
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  cost?: number;
  model?: string;
  duration_ms?: number;
}

export type ChatEvent =
  | { type: 'init'; sessionId: string; claudeSessionId: string }
  | { type: 'message'; content: string; role: 'assistant' }
  | { type: 'text_delta'; delta: string }
  | { type: 'tool_use'; toolName: string; toolInput: unknown; toolUseId: string }
  | { type: 'tool_result'; toolName: string; result: unknown; toolUseId: string }
  | { type: 'tool_approval_request'; request: ToolApprovalRequest }
  | { type: 'tool_approval_resolved'; requestId: string }
  | { type: 'thinking'; content: string }
  | { type: 'done'; result: string; usage: MessageMetadata['usage'] }
  | { type: 'error'; message: string };

/** ツール確認リクエスト */
export interface ToolApprovalRequest {
  requestId: string;
  toolName: string;
  toolInput: unknown;
  description?: string;
  isDangerous: boolean;
}

/** ツール確認レスポンス */
export interface ToolApprovalResponse {
  requestId: string;
  decision: 'allow' | 'deny' | 'always';
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  settings?: ChatSettings;
}

export interface ChatSettings {
  model?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  permissionMode?: PermissionMode;
  systemPrompt?: string;
  maxTurns?: number;
  workspacePath?: string;
  workspaceDisplayPath?: string;
}

export type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';

export interface MessageListResponse {
  messages: Message[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
}

/** 中断リクエスト */
export interface AbortRequest {
  sessionId: string;
}

/** 中断レスポンス */
export interface AbortResponse {
  success: boolean;
  message?: string;
}
