import type { ChatSettings } from './chat';

export interface Session {
  id: string;
  title: string;
  claudeSessionId: string | null;
  createdAt: string;
  updatedAt: string;
  settings: ChatSettings | null;
  isArchived: boolean;
}

export interface SessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  isArchived: boolean;
}

export interface SessionListResponse {
  sessions: SessionSummary[];
  total: number;
}

export interface SessionDetailResponse {
  session: Session;
  messages: import('./chat').Message[];
}
