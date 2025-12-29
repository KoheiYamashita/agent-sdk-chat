// セッション検索結果
export interface SearchSessionResult {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  isArchived: boolean;
  tagId: string | null;
  tagName: string | null;
}

// セッション検索レスポンス
export interface SessionSearchResponse {
  sessions: SearchSessionResult[];
  query: string;
}

// メッセージ検索結果
export interface SearchMessageResult {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

// メッセージ検索レスポンス
export interface MessageSearchResponse {
  messages: SearchMessageResult[];
  query: string;
  sessionId: string;
}
