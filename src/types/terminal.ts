/**
 * Terminal WebSocket message types
 */
export type TerminalMessageType =
  | 'create'    // Create new PTY session
  | 'destroy'   // Destroy PTY session
  | 'input'     // User input to PTY
  | 'output'    // PTY output to client
  | 'resize'    // Terminal resize
  | 'ready'     // PTY session ready
  | 'reconnect' // Reconnection with buffer
  | 'error'     // Error message
  | 'ping'      // Heartbeat ping
  | 'pong';     // Heartbeat pong

/**
 * Client to server messages
 */
export interface TerminalClientMessage {
  type: 'create' | 'destroy' | 'input' | 'resize' | 'ping';
  chatSessionId?: string;
  workspacePath?: string;
  data?: string;
  cols?: number;
  rows?: number;
}

/**
 * Server to client messages
 */
export interface TerminalServerMessage {
  type: 'output' | 'ready' | 'reconnect' | 'error' | 'pong';
  data?: string;
  buffer?: string;
  sessionId?: string;
  error?: string;
}

/**
 * PTY session stored on server
 */
export interface PtySession {
  chatSessionId: string;
  workspacePath: string;
  outputBuffer: string[];
  createdAt: Date;
}

/**
 * Terminal panel state
 */
export interface TerminalState {
  isOpen: boolean;
  isConnected: boolean;
  height: number;
}
