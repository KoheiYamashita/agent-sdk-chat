import type { IPty } from 'node-pty';
import type { WebSocket } from 'ws';

const MAX_BUFFER_SIZE = 100000; // Max characters to keep in buffer

interface StoredSession {
  pty: IPty;
  chatSessionId: string;
  workspacePath: string;
  outputBuffer: string[];
  bufferSize: number;
  createdAt: Date;
  activeWs: WebSocket | null;  // Currently active WebSocket for this session
}

class SessionStore {
  private sessions = new Map<string, StoredSession>();

  create(
    chatSessionId: string,
    workspacePath: string,
    pty: IPty
  ): StoredSession {
    const session: StoredSession = {
      pty,
      chatSessionId,
      workspacePath,
      outputBuffer: [],
      bufferSize: 0,
      createdAt: new Date(),
      activeWs: null,
    };

    this.sessions.set(chatSessionId, session);
    return session;
  }

  setActiveWs(chatSessionId: string, ws: WebSocket | null): void {
    const session = this.sessions.get(chatSessionId);
    if (session) {
      session.activeWs = ws;
    }
  }

  getActiveWs(chatSessionId: string): WebSocket | null {
    const session = this.sessions.get(chatSessionId);
    return session?.activeWs ?? null;
  }

  get(chatSessionId: string): StoredSession | undefined {
    return this.sessions.get(chatSessionId);
  }

  has(chatSessionId: string): boolean {
    return this.sessions.has(chatSessionId);
  }

  appendOutput(chatSessionId: string, data: string): void {
    const session = this.sessions.get(chatSessionId);
    if (!session) return;

    session.outputBuffer.push(data);
    session.bufferSize += data.length;

    // Trim buffer if too large
    while (session.bufferSize > MAX_BUFFER_SIZE && session.outputBuffer.length > 1) {
      const removed = session.outputBuffer.shift();
      if (removed) {
        session.bufferSize -= removed.length;
      }
    }
  }

  getBuffer(chatSessionId: string): string {
    const session = this.sessions.get(chatSessionId);
    if (!session) return '';
    return session.outputBuffer.join('');
  }

  destroy(chatSessionId: string): boolean {
    const session = this.sessions.get(chatSessionId);
    if (!session) return false;

    try {
      session.pty.kill();
    } catch {
      // PTY might already be dead
    }

    this.sessions.delete(chatSessionId);
    return true;
  }

  destroyAll(): void {
    for (const [id] of this.sessions) {
      this.destroy(id);
    }
  }

  list(): string[] {
    return Array.from(this.sessions.keys());
  }
}

export const sessionStore = new SessionStore();
