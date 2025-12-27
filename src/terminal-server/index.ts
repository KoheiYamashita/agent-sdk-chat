import { WebSocketServer, WebSocket } from 'ws';
import { spawn } from 'node-pty';
import { createServer } from 'http';
import { parse } from 'url';
import path from 'path';
import { sessionStore } from './session-store';

const PORT = parseInt(process.env.TERMINAL_PORT || '3001', 10);
const WORKSPACE_BASE = process.env.WORKSPACE_BASE_PATH || './workspace';
// Allow all origins in development, or specify via env
const ALLOWED_ORIGINS = process.env.TERMINAL_ALLOWED_ORIGINS?.split(',') || null;

// Validate workspace path to prevent path traversal
function isAllowedWorkspace(requestedPath: string): boolean {
  const basePath = path.resolve(WORKSPACE_BASE);
  const resolvedPath = path.resolve(basePath, requestedPath);
  // Ensure exact match or path is inside base directory (prevent /workspace-evil matching /workspace)
  return resolvedPath === basePath || resolvedPath.startsWith(basePath + path.sep);
}

// Map WebSocket to chatSessionId for cleanup
const wsToSession = new Map<WebSocket, string>();

const server = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', sessions: sessionStore.list().length }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // CORS check (skip if ALLOWED_ORIGINS is not set)
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS && origin && !ALLOWED_ORIGINS.includes(origin)) {
    console.log(`Rejected connection from origin: ${origin}`);
    ws.close(4001, 'Unauthorized origin');
    return;
  }

  console.log(`New WebSocket connection from origin: ${origin || 'unknown'}`);

  ws.on('message', (rawMessage) => {
    try {
      const message = JSON.parse(rawMessage.toString());

      switch (message.type) {
        case 'create':
          handleCreate(ws, message);
          break;

        case 'destroy':
          handleDestroy(ws, message);
          break;

        case 'input':
          handleInput(ws, message);
          break;

        case 'resize':
          handleResize(ws, message);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    const sessionId = wsToSession.get(ws);
    if (sessionId) {
      console.log(`WebSocket closed for session: ${sessionId}`);
      // Don't destroy PTY on disconnect - keep it alive for reconnection
      // Clear activeWs if this was the active connection
      if (sessionStore.getActiveWs(sessionId) === ws) {
        sessionStore.setActiveWs(sessionId, null);
      }
      wsToSession.delete(ws);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function handleCreate(ws: WebSocket, message: { chatSessionId?: string; workspacePath?: string }) {
  const { chatSessionId, workspacePath } = message;

  if (!chatSessionId || !workspacePath) {
    ws.send(JSON.stringify({ type: 'error', error: 'Missing chatSessionId or workspacePath' }));
    return;
  }

  // Check if session already exists
  if (sessionStore.has(chatSessionId)) {
    // Reconnect to existing session
    const buffer = sessionStore.getBuffer(chatSessionId);
    wsToSession.set(ws, chatSessionId);

    // Update active WebSocket for this session (no new onData listener needed)
    sessionStore.setActiveWs(chatSessionId, ws);

    ws.send(JSON.stringify({
      type: 'reconnect',
      sessionId: chatSessionId,
      buffer,
    }));

    console.log(`Reconnected to session: ${chatSessionId}`);
    return;
  }

  // Validate workspace path
  if (!isAllowedWorkspace(workspacePath)) {
    ws.send(JSON.stringify({ type: 'error', error: 'Invalid workspace path' }));
    return;
  }

  const resolvedPath = path.resolve(WORKSPACE_BASE, workspacePath);
  const resolvedBase = path.resolve(WORKSPACE_BASE);
  const workspaceParent = path.dirname(resolvedBase);

  // Create new PTY with OS-specific shell configuration
  const isWindows = process.platform === 'win32';

  let shell: string;
  let shellArgs: string[];
  let envVars: Record<string, string>;

  if (isWindows) {
    // Windows: use PowerShell
    shell = 'powershell.exe';
    shellArgs = ['-NoProfile', '-NoLogo'];
    envVars = {
      ...process.env as Record<string, string>,
      TERM: 'xterm-256color',
    };
  } else {
    // Linux/macOS: use user's shell
    shell = process.env.SHELL || 'bash';
    const isZsh = shell.endsWith('zsh');
    const isBash = shell.endsWith('bash');

    // Custom PS1: show path relative to workspace parent (e.g., "workspace/project/src $")
    const customPS1 = '\\[\\e[1;34m\\]${PWD#$WORKSPACE_PARENT/}\\[\\e[0m\\] $ ';

    // Shell arguments to prevent rc files from overriding PS1
    shellArgs = isBash ? ['--norc'] : isZsh ? ['--no-rcs'] : [];

    envVars = {
      ...process.env as Record<string, string>,
      TERM: 'xterm-256color',
      WORKSPACE_PARENT: workspaceParent,
      PS1: customPS1,
    };
  }

  try {
    const pty = spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: resolvedPath,
      env: envVars,
    });

    sessionStore.create(chatSessionId, workspacePath, pty);
    sessionStore.setActiveWs(chatSessionId, ws);
    wsToSession.set(ws, chatSessionId);

    // PTY output -> WebSocket (single listener, uses dynamic activeWs lookup)
    pty.onData((data) => {
      const activeWs = sessionStore.getActiveWs(chatSessionId);
      if (activeWs?.readyState === WebSocket.OPEN) {
        activeWs.send(JSON.stringify({ type: 'output', data }));
      }
      sessionStore.appendOutput(chatSessionId, data);
    });

    // PTY exit
    pty.onExit(({ exitCode }) => {
      console.log(`PTY exited with code ${exitCode} for session: ${chatSessionId}`);
      const activeWs = sessionStore.getActiveWs(chatSessionId);
      sessionStore.destroy(chatSessionId);
      if (activeWs?.readyState === WebSocket.OPEN) {
        activeWs.send(JSON.stringify({ type: 'error', error: `Shell exited with code ${exitCode}` }));
      }
    });

    ws.send(JSON.stringify({
      type: 'ready',
      sessionId: chatSessionId,
    }));

    console.log(`Created new session: ${chatSessionId} at ${resolvedPath}`);
  } catch (error) {
    console.error('Failed to create PTY:', error);
    ws.send(JSON.stringify({ type: 'error', error: 'Failed to create terminal session' }));
  }
}

function handleDestroy(ws: WebSocket, message: { chatSessionId?: string }) {
  const { chatSessionId } = message;

  if (!chatSessionId) {
    ws.send(JSON.stringify({ type: 'error', error: 'Missing chatSessionId' }));
    return;
  }

  const destroyed = sessionStore.destroy(chatSessionId);
  console.log(`Destroyed session ${chatSessionId}: ${destroyed}`);
}

function handleInput(ws: WebSocket, message: { data?: string }) {
  const sessionId = wsToSession.get(ws);
  if (!sessionId) {
    ws.send(JSON.stringify({ type: 'error', error: 'No active session' }));
    return;
  }

  const session = sessionStore.get(sessionId);
  if (!session) {
    ws.send(JSON.stringify({ type: 'error', error: 'Session not found' }));
    return;
  }

  if (message.data) {
    session.pty.write(message.data);
  }
}

function handleResize(ws: WebSocket, message: { cols?: number; rows?: number }) {
  const sessionId = wsToSession.get(ws);
  if (!sessionId) return;

  const session = sessionStore.get(sessionId);
  if (!session) return;

  const cols = message.cols || 80;
  const rows = message.rows || 24;

  try {
    session.pty.resize(cols, rows);
  } catch (error) {
    console.error('Failed to resize PTY:', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  sessionStore.destroyAll();
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  sessionStore.destroyAll();
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Terminal server running on port ${PORT}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS ? ALLOWED_ORIGINS.join(', ') : 'all (no restriction)'}`);
  console.log(`Workspace base: ${path.resolve(WORKSPACE_BASE)}`);
});
