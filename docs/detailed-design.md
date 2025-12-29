# Claude Code Web UI - 詳細設計書

## 1. API設計

### 1.1 チャットAPI

#### POST /api/chat
チャットメッセージを送信し、ストリーミングレスポンスを受け取る。

**リクエスト:**
```typescript
interface ChatRequest {
  message: string;
  sessionId?: string;       // 既存セッション再開時
  settings?: {
    model?: string;
    allowedTools?: string[];
    disallowedTools?: string[];
    mcpServers?: Record<string, McpServerConfig>;
    agents?: Record<string, AgentDefinition>;
    permissionMode?: PermissionMode;
    systemPrompt?: string;
    maxTurns?: number;
  };
}
```

**レスポンス (Server-Sent Events):**
```typescript
// イベントタイプ
type ChatEvent =
  | { type: 'init'; sessionId: string; claudeSessionId: string }
  | { type: 'message'; content: string; role: 'assistant' }
  | { type: 'tool_use'; toolName: string; toolInput: unknown }
  | { type: 'tool_result'; toolName: string; result: unknown }
  | { type: 'thinking'; content: string }
  | { type: 'done'; result: string; usage: Usage }
  | { type: 'error'; message: string };
```

**実装例:**
```typescript
// src/app/api/chat/route.ts
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: Request) {
  const body = await request.json();
  const { message, sessionId, settings } = body as ChatRequest;

  // セッション取得または作成
  let session = sessionId
    ? await prisma.session.findUnique({ where: { id: sessionId } })
    : await prisma.session.create({
        data: { title: message.slice(0, 50) }
      });

  // ユーザーメッセージを保存
  await prisma.message.create({
    data: {
      sessionId: session.id,
      role: 'user',
      content: message
    }
  });

  // SSEストリームを作成
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const queryOptions = {
          prompt: message,
          options: {
            resume: session.claudeSessionId ?? undefined,
            ...settings,
            includePartialMessages: true
          }
        };

        for await (const msg of query(queryOptions)) {
          const event = processSDKMessage(msg);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );

          // 完了時にセッションIDを更新
          if (msg.type === 'system' && msg.subtype === 'init') {
            await prisma.session.update({
              where: { id: session.id },
              data: { claudeSessionId: msg.session_id }
            });
          }

          // アシスタントメッセージを保存
          if (msg.type === 'result') {
            await prisma.message.create({
              data: {
                sessionId: session.id,
                role: 'assistant',
                content: msg.result,
                metadata: {
                  usage: msg.usage,
                  cost: msg.total_cost_usd
                }
              }
            });
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`)
        );
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

function processSDKMessage(msg: SDKMessage): ChatEvent {
  switch (msg.type) {
    case 'system':
      return {
        type: 'init',
        sessionId: msg.session_id,
        claudeSessionId: msg.session_id
      };
    case 'assistant':
      // メッセージ内容を抽出
      const textContent = msg.message.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');
      return { type: 'message', content: textContent, role: 'assistant' };
    case 'result':
      return {
        type: 'done',
        result: msg.result,
        usage: msg.usage
      };
    default:
      return { type: 'message', content: '', role: 'assistant' };
  }
}
```

---

### 1.2 セッションAPI

#### GET /api/sessions
セッション一覧を取得。

**レスポンス:**
```typescript
interface SessionListResponse {
  sessions: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    isArchived: boolean;
  }[];
  total: number;
}
```

#### GET /api/sessions/[id]
特定セッションの詳細を取得。

**レスポンス:**
```typescript
interface SessionDetailResponse {
  session: {
    id: string;
    title: string;
    claudeSessionId: string | null;
    createdAt: string;
    updatedAt: string;
    settings: SessionSettings | null;
    isArchived: boolean;
  };
  messages: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    toolCalls: ToolCall[] | null;
    inputTokens: number | null;
    outputTokens: number | null;
    cacheCreationInputTokens: number | null;
    cacheReadInputTokens: number | null;
    cost: number | null;
    model: string | null;
    durationMs: number | null;
    thinkingContent: string | null;
    createdAt: string;
  }[];
}
```

#### PATCH /api/sessions/[id]
セッションを更新（タイトル変更、アーカイブなど）。

#### DELETE /api/sessions/[id]
セッションを削除。

---

### 1.3 設定API

#### GET /api/settings
現在の設定を取得。

#### PUT /api/settings
設定を更新。

**リクエスト/レスポンス:**
```typescript
interface SettingsData {
  general: {
    defaultModel: string;
    theme: 'light' | 'dark' | 'system';
    language: 'ja' | 'en';
  };
  permissions: {
    mode: PermissionMode;
    allowedTools: string[];
    disallowedTools: string[];
  };
  sandbox: {
    enabled: boolean;
    workspacePath: string;
  };
}
```

---

### 1.4 MCP管理API

#### GET /api/mcp
MCP サーバー一覧を取得。

#### POST /api/mcp
新しいMCPサーバーを追加。

**リクエスト:**
```typescript
interface CreateMCPRequest {
  name: string;
  type: 'stdio' | 'sse' | 'http';
  // stdio type
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // sse/http type
  url?: string;
  headers?: Record<string, string>;
}
```

#### PATCH /api/mcp/[id]
MCPサーバーを更新。

#### DELETE /api/mcp/[id]
MCPサーバーを削除。

---

### 1.5 ツール管理API

#### GET /api/tools
利用可能なツール一覧と設定を取得。

**レスポンス:**
```typescript
interface ToolsResponse {
  builtinTools: {
    name: string;
    description: string;
    isEnabled: boolean;
  }[];
  mcpTools: {
    serverName: string;
    tools: {
      name: string;
      description: string;
      inputSchema: object;
    }[];
  }[];
}
```

---

### 1.6 エージェント管理API

#### GET /api/agents
Subagent一覧を取得。

#### POST /api/agents
新しいSubagentを作成。

**リクエスト:**
```typescript
interface CreateAgentRequest {
  name: string;
  description: string;
  prompt: string;
  tools?: string[];
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
}
```

#### PATCH /api/agents/[id]
Subagentを更新。

#### DELETE /api/agents/[id]
Subagentを削除。

---

### 1.7 検索API

#### GET /api/search/sessions
セッションを検索。タイトル、メッセージ内容、モデル名で検索可能。

**クエリパラメータ:**
```
q: string  // 検索クエリ（必須、1文字以上）
```

**レスポンス:**
```json
{
  "sessions": [
    {
      "id": "session-id",
      "title": "セッションタイトル",
      "updatedAt": "2025-01-01T00:00:00.000Z",
      "messageCount": 10,
      "isArchived": false
    }
  ],
  "query": "検索クエリ"
}
```

#### GET /api/search/messages
セッション内のメッセージを検索。

**クエリパラメータ:**
```
q: string        // 検索クエリ（必須、1文字以上）
sessionId: string  // セッションID（必須）
```

**レスポンス:**
```json
{
  "messages": [
    {
      "id": "message-id",
      "role": "assistant",
      "content": "メッセージ内容",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "query": "検索クエリ",
  "sessionId": "session-id"
}
```

---

### 1.8 ターミナルWebSocket API

ターミナル機能はHTTP APIではなく、WebSocketを使用してリアルタイム通信を行う。
Next.jsのカスタムサーバー（`server.ts`）でWebSocketサーバーを統合。

#### 接続エンドポイント
```
ws://localhost:3000/api/terminal
wss://example.com/api/terminal  # HTTPS環境
```

#### クライアント → サーバー メッセージ
```typescript
type TerminalClientMessage =
  | { type: 'create'; chatSessionId: string; workspacePath: string }
  | { type: 'destroy'; chatSessionId: string }
  | { type: 'input'; data: string }
  | { type: 'resize'; cols: number; rows: number }
  | { type: 'ping' };
```

| type | 説明 |
|------|------|
| `create` | 新しいPTYセッションを作成（既存セッションがあれば再接続） |
| `destroy` | PTYセッションを破棄 |
| `input` | ユーザー入力をPTYに送信 |
| `resize` | ターミナルサイズ変更を通知 |
| `ping` | ハートビート（30秒間隔） |

#### サーバー → クライアント メッセージ
```typescript
type TerminalServerMessage =
  | { type: 'ready'; sessionId: string }
  | { type: 'reconnect'; sessionId: string; buffer: string }
  | { type: 'output'; data: string }
  | { type: 'error'; error: string }
  | { type: 'pong' };
```

| type | 説明 |
|------|------|
| `ready` | 新しいPTYセッションが準備完了 |
| `reconnect` | 既存セッションに再接続（バッファ付き） |
| `output` | PTYからの出力データ |
| `error` | エラーメッセージ |
| `pong` | ハートビート応答 |

#### PTYセッション管理
```typescript
interface PtySession {
  chatSessionId: string;     // チャットセッションと1:1で紐付け
  workspacePath: string;     // 作業ディレクトリ
  outputBuffer: string[];    // 再接続用出力バッファ（最大100KB）
  createdAt: Date;
}
```

**セキュリティ:**
- ワークスペースパスのバリデーション（パストラバーサル防止）
- `WORKSPACE_BASE_PATH` 環境変数で制限
- WebSocket切断時もPTYは維持（再接続可能）

---

### 1.9 モデル管理API

カスタムモデルの作成・管理と、利用可能なモデル一覧の取得を行うAPI。

#### GET /api/models
すべてのモデル（標準+カスタム）を取得。

**レスポンス:**
```typescript
interface AllModelsResponse {
  standardModels: StandardModel[];
  customModels: CustomModel[];
}

interface StandardModel {
  id: string;           // SDK ModelInfo.value - APIで使用するモデルID
  displayName: string;  // SDK ModelInfo.displayName
  description: string;  // SDK ModelInfo.description
}

interface CustomModel {
  id: string;
  name: string;         // 一意の識別名（URL-safe）
  displayName: string;  // 表示名
  baseModel: string;    // ベースとなる標準モデルID
  systemPrompt?: string | null;
  description?: string | null;
  icon?: string | null;        // Lucideアイコン名
  iconColor?: string | null;   // Tailwind CSSカラークラス
  iconImageUrl?: string | null; // カスタム画像URL（data: URLまたはhttps:）
  isEnabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

#### GET /api/models/supported
標準モデル（SDK提供）のみを取得。

**レスポンス:**
```typescript
interface StandardModelsResponse {
  models: StandardModel[];
}
```

#### GET /api/models/custom
カスタムモデル一覧を取得。

**レスポンス:**
```typescript
interface CustomModelsResponse {
  models: CustomModel[];
}
```

#### POST /api/models/custom
新しいカスタムモデルを作成。

**リクエスト:**
```typescript
interface CustomModelCreateRequest {
  name: string;          // 一意の識別名
  displayName: string;   // 表示名
  baseModel: string;     // ベースモデルID
  systemPrompt?: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  iconImageUrl?: string;
}
```

**レスポンス:**
```typescript
// 成功時: 201 Created
CustomModel

// エラー時: 400 Bad Request
{ error: "name, displayName, and baseModel are required" }

// エラー時: 409 Conflict
{ error: "A model with this name already exists" }
```

#### GET /api/models/custom/[id]
特定のカスタムモデルを取得。

#### PUT /api/models/custom/[id]
カスタムモデルを更新。

**リクエスト:**
```typescript
interface CustomModelUpdateRequest {
  name?: string;
  displayName?: string;
  baseModel?: string;
  systemPrompt?: string | null;
  description?: string | null;
  icon?: string | null;
  iconColor?: string | null;
  iconImageUrl?: string | null;
  isEnabled?: boolean;
  sortOrder?: number;
}
```

#### DELETE /api/models/custom/[id]
カスタムモデルを削除。

**レスポンス:**
```typescript
{ success: true }
```

---

## 2. フロントエンド コンポーネント設計

### 2.1 ページ構成

```
app/
├── page.tsx                 # リダイレクト → /chat
├── chat/                    # チャット関連ページ
│   ├── layout.tsx           # サイドバー付きレイアウト
│   ├── page.tsx             # 新規チャット
│   └── [sessionId]/
│       └── page.tsx         # 既存セッション
├── settings/
│   ├── layout.tsx           # 設定ページレイアウト
│   ├── page.tsx             # 一般設定（権限モード、デフォルトツール）
│   └── models/
│       └── page.tsx         # カスタムモデル管理
└── api/                     # APIルート
    ├── chat/
    │   ├── route.ts         # POST チャット送信
    │   └── approve/
    │       └── route.ts     # POST ツール承認
    ├── sessions/
    │   ├── route.ts         # GET/POST セッション
    │   └── [id]/
    │       ├── route.ts     # GET/PATCH/DELETE セッション詳細
    │       └── messages/
    │           └── route.ts # GET メッセージ差分ロード
    ├── settings/
    │   └── route.ts         # GET/PUT 設定
    ├── mcp/
    │   ├── route.ts         # GET/POST MCPサーバー
    │   └── [id]/
    │       └── route.ts     # GET/PATCH/DELETE MCPサーバー詳細
    ├── agents/
    │   ├── route.ts         # GET/POST エージェント
    │   └── [id]/
    │       └── route.ts     # GET/PATCH/DELETE エージェント詳細
    └── health/
        └── route.ts         # GET ヘルスチェック
```

### 2.2 主要コンポーネント

#### ChatContainer
```typescript
// components/chat/ChatContainer.tsx
interface ChatContainerProps {
  sessionId?: string;
}

export function ChatContainer({ sessionId }: ChatContainerProps) {
  const { messages, isLoading, sendMessage, session } = useChat(sessionId);

  return (
    <div className="flex flex-col h-full">
      <ChatHeader session={session} />
      <MessageList messages={messages} isLoading={isLoading} />
      <InputArea onSubmit={sendMessage} disabled={isLoading} />
    </div>
  );
}
```

#### MessageItem
```typescript
// components/chat/MessageItem.tsx
interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex gap-4 p-4",
      isUser ? "bg-muted/50" : "bg-background"
    )}>
      <Avatar>
        {isUser ? <UserIcon /> : <BotIcon />}
      </Avatar>
      <div className="flex-1 space-y-2">
        <MarkdownRenderer content={message.content} />
        {message.toolCalls && (
          <ToolCallList toolCalls={message.toolCalls} />
        )}
      </div>
    </div>
  );
}
```

#### InputArea
```typescript
// components/chat/InputArea.tsx
interface InputAreaProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
}

export function InputArea({ onSubmit, disabled }: InputAreaProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    onSubmit(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t p-4">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          className="min-h-[60px] resize-none pr-12"
          disabled={disabled}
        />
        <Button
          size="icon"
          className="absolute right-2 bottom-2"
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
        >
          <SendIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

#### Sidebar
```typescript
// components/sidebar/Sidebar.tsx
export function Sidebar() {
  const { sessions, currentSessionId, createSession, deleteSession } = useSession();

  return (
    <aside className="w-64 border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <Button className="w-full" onClick={createSession}>
          <PlusIcon className="h-4 w-4 mr-2" />
          新規チャット
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <SessionList
          sessions={sessions}
          currentSessionId={currentSessionId}
          onDelete={deleteSession}
        />
      </ScrollArea>

      <div className="p-4 border-t">
        <Link href="/settings">
          <Button variant="ghost" className="w-full justify-start">
            <SettingsIcon className="h-4 w-4 mr-2" />
            設定
          </Button>
        </Link>
      </div>
    </aside>
  );
}
```

#### Terminal
```typescript
// components/terminal/Terminal.tsx
interface TerminalProps {
  chatSessionId: string;      // チャットセッションID
  workspacePath: string;      // 作業ディレクトリ
  onReady?: () => void;       // PTYセッション準備完了時
  onError?: (error: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function Terminal({
  chatSessionId,
  workspacePath,
  onReady,
  onError,
  onConnectionChange,
}: TerminalProps) {
  // xterm.js インスタンス
  const terminalRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // WebSocket接続
  const connect = useCallback(() => {
    const ws = new WebSocket(getTerminalWsUrl());

    ws.onopen = () => {
      onConnectionChange?.(true);
      // セッション作成リクエスト
      ws.send(JSON.stringify({
        type: 'create',
        chatSessionId,
        workspacePath,
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case 'ready':
        case 'reconnect':
          if (message.buffer) {
            terminalRef.current?.write(message.buffer);
          }
          onReady?.();
          break;
        case 'output':
          terminalRef.current?.write(message.data);
          break;
        case 'error':
          onError?.(message.error);
          break;
      }
    };

    ws.onclose = () => {
      onConnectionChange?.(false);
      // 3秒後に再接続
      setTimeout(() => connect(), 3000);
    };
  }, [chatSessionId, workspacePath]);

  // ターミナル初期化
  useEffect(() => {
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      theme: { background: '#1e1e2e', foreground: '#cdd6f4' },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    // ユーザー入力をWebSocketに送信
    term.onData((data) => {
      wsRef.current?.send(JSON.stringify({ type: 'input', data }));
    });

    connect();
    return () => term.dispose();
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
```

#### TerminalPanel
```typescript
// components/terminal/TerminalPanel.tsx
interface TerminalPanelProps {
  chatSessionId: string;
  workspacePath: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TerminalPanel({
  chatSessionId,
  workspacePath,
  isOpen,
  onClose,
}: TerminalPanelProps) {
  const [height, setHeight] = useState(300);  // ドラッグでリサイズ可能
  const [isMaximized, setIsMaximized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="border-t" style={{ height: isMaximized ? '100%' : height }}>
      {/* リサイズハンドル */}
      <div className="h-1 cursor-row-resize" onMouseDown={handleResize} />

      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b">
        <div className="flex items-center gap-2">
          <span>Terminal</span>
          <Circle className={isConnected ? 'text-green-500' : 'text-red-500'} />
        </div>
        <div className="flex gap-1">
          <Button onClick={() => setIsMaximized(!isMaximized)}>
            {isMaximized ? <Minimize2 /> : <Maximize2 />}
          </Button>
          <Button onClick={onClose}><X /></Button>
        </div>
      </div>

      {/* ターミナル本体 */}
      <Terminal
        chatSessionId={chatSessionId}
        workspacePath={workspacePath}
        onConnectionChange={setIsConnected}
      />
    </div>
  );
}
```

---

## 3. カスタムフック設計

### 3.1 useChat
```typescript
// hooks/useChat.ts
interface UseChatOptions {
  sessionId?: string;
  resetKey?: number;  // 変更時に全状態をリセット（新規チャットボタン用）
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  session: Session | null;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
}

export function useChat({ sessionId, resetKey = 0 }: UseChatOptions = {}): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // セッションとメッセージの初期読み込み
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId]);

  const loadSession = async (id: string) => {
    const response = await fetch(`/api/sessions/${id}`);
    const data = await response.json();
    setSession(data.session);
    setMessages(data.messages);
  };

  const sendMessage = async (content: string) => {
    setIsLoading(true);
    setError(null);

    // ユーザーメッセージを即座に表示
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          sessionId: session?.id
        }),
        signal: abortControllerRef.current.signal
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            const event: ChatEvent = JSON.parse(data);

            if (event.type === 'message') {
              assistantContent += event.content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return [...prev.slice(0, -1), { ...last, content: assistantContent }];
                }
                return [...prev, {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: assistantContent,
                  createdAt: new Date().toISOString()
                }];
              });
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
  };

  return { messages, isLoading, error, session, sendMessage, stopGeneration };
}
```

### 3.2 useSession
```typescript
// hooks/useSession.ts
interface UseSessionReturn {
  sessions: SessionSummary[];
  currentSessionId: string | null;
  isLoading: boolean;
  createSession: () => Promise<string>;
  deleteSession: (id: string) => Promise<void>;
  updateSession: (id: string, data: Partial<Session>) => Promise<void>;
}

export function useSession(): UseSessionReturn {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  const currentSessionId = useMemo(() => {
    const match = pathname.match(/\/chat\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const response = await fetch('/api/sessions');
    const data = await response.json();
    setSessions(data.sessions);
    setIsLoading(false);
  };

  const createSession = async (): Promise<string> => {
    const response = await fetch('/api/sessions', { method: 'POST' });
    const data = await response.json();
    setSessions((prev) => [data.session, ...prev]);
    return data.session.id;
  };

  const deleteSession = async (id: string) => {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSession = async (id: string, data: Partial<Session>) => {
    await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    await loadSessions();
  };

  return { sessions, currentSessionId, isLoading, createSession, deleteSession, updateSession };
}
```

### 3.3 useSettings
```typescript
// hooks/useSettings.ts
interface UseSettingsReturn {
  settings: SettingsData | null;
  isLoading: boolean;
  updateSettings: (data: Partial<SettingsData>) => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const response = await fetch('/api/settings');
    const data = await response.json();
    setSettings(data);
    setIsLoading(false);
  };

  const updateSettings = async (data: Partial<SettingsData>) => {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, ...data })
    });
    const updated = await response.json();
    setSettings(updated);
  };

  return { settings, isLoading, updateSettings };
}
```

---

## 4. 型定義

### 4.1 チャット関連
```typescript
// types/chat.ts
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  metadata?: MessageMetadata;
  createdAt: string;
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
  | { type: 'tool_use'; toolName: string; toolInput: unknown }
  | { type: 'tool_result'; toolName: string; result: unknown }
  | { type: 'thinking'; content: string }
  | { type: 'done'; result: string; usage: Usage }
  | { type: 'error'; message: string };
```

### 4.2 セッション関連
```typescript
// types/session.ts
export interface Session {
  id: string;
  title: string;
  claudeSessionId: string | null;
  createdAt: string;
  updatedAt: string;
  settings: SessionSettings | null;
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

export interface SessionSettings {
  model?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  permissionMode?: PermissionMode;
  systemPrompt?: string;
}
```

### 4.3 設定関連
```typescript
// types/settings.ts
export interface SettingsData {
  general: GeneralSettings;
  permissions: PermissionSettings;
  sandbox: SandboxSettings;
  appearance: AppearanceSettings;
}

export interface GeneralSettings {
  defaultModel: string;
  defaultPermissionMode: PermissionMode;
  defaultThinkingEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en';
}

export interface AppearanceSettings {
  userIcon: AvatarIconType;
  userInitials: string;
  userImageUrl: string;
  userName: string;
  botIcon: BotIconType;
  botInitials: string;
  botImageUrl: string;
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

export type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';

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
```

### 4.4 モデル関連
```typescript
// types/models.ts

/**
 * 標準モデル（SDK提供）
 */
export interface StandardModel {
  id: string;           // SDK ModelInfo.value - APIで使用するモデルID
  displayName: string;  // SDK ModelInfo.displayName
  description: string;  // SDK ModelInfo.description
}

/**
 * カスタムモデル（Prisma CustomModel）
 */
export interface CustomModel {
  id: string;
  name: string;           // 一意の識別名（URL-safe）
  displayName: string;    // 表示名
  baseModel: string;      // ベースとなる標準モデルID
  systemPrompt?: string | null;
  description?: string | null;
  icon?: string | null;        // Lucideアイコン名
  iconColor?: string | null;   // Tailwind CSSカラークラス
  iconImageUrl?: string | null; // カスタム画像URL
  isEnabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 選択UI用の統一モデル型
 */
export interface SelectableModel {
  type: 'standard' | 'custom';
  id: string;             // 標準: モデルID, カスタム: cuid
  displayName: string;
  description?: string;
  icon?: string | null;
  iconColor?: string | null;
  iconImageUrl?: string | null;
  baseModelId: string;    // APIで使用する実際のモデルID
  systemPrompt?: string | null;
}

/**
 * API リクエスト/レスポンス型
 */
export interface CustomModelCreateRequest {
  name: string;
  displayName: string;
  baseModel: string;
  systemPrompt?: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  iconImageUrl?: string;
}

export interface CustomModelUpdateRequest {
  name?: string;
  displayName?: string;
  baseModel?: string;
  systemPrompt?: string | null;
  description?: string | null;
  icon?: string | null;
  iconColor?: string | null;
  iconImageUrl?: string | null;
  isEnabled?: boolean;
  sortOrder?: number;
}

export interface AllModelsResponse {
  standardModels: StandardModel[];
  customModels: CustomModel[];
}
```

### 4.5 ターミナル関連
```typescript
// types/terminal.ts

/**
 * クライアント → サーバー メッセージ
 */
export interface TerminalClientMessage {
  type: 'create' | 'destroy' | 'input' | 'resize' | 'ping';
  chatSessionId?: string;  // create/destroy時に必要
  workspacePath?: string;  // create時に必要
  data?: string;           // input時のデータ
  cols?: number;           // resize時の列数
  rows?: number;           // resize時の行数
}

/**
 * サーバー → クライアント メッセージ
 */
export interface TerminalServerMessage {
  type: 'output' | 'ready' | 'reconnect' | 'error' | 'pong';
  data?: string;           // output時のデータ
  buffer?: string;         // reconnect時の出力バッファ
  sessionId?: string;      // ready/reconnect時のセッションID
  error?: string;          // error時のエラーメッセージ
}

/**
 * PTYセッション（サーバー側）
 */
export interface PtySession {
  chatSessionId: string;
  workspacePath: string;
  outputBuffer: string[];
  createdAt: Date;
}

/**
 * ターミナルパネル状態
 */
export interface TerminalState {
  isOpen: boolean;
  isConnected: boolean;
  height: number;
}
```

---

## 5. 状態管理

このアプリケーションでは、React Query（TanStack Query）を使用してサーバー状態を管理します。

### 5.1 Query Keys
```typescript
// lib/query-keys.ts
export const queryKeys = {
  sessions: {
    all: ['sessions'] as const,
    detail: (id: string) => ['sessions', id] as const
  },
  settings: ['settings'] as const,
  mcp: ['mcp'] as const,
  agents: ['agents'] as const,
  tools: ['tools'] as const
};
```

### 5.2 Query Hooks
```typescript
// hooks/queries/useSessions.ts
export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions.all,
    queryFn: async () => {
      const response = await fetch('/api/sessions');
      return response.json();
    }
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: queryKeys.sessions.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${id}`);
      return response.json();
    },
    enabled: !!id
  });
}
```

---

## 6. エラーハンドリング

### 6.1 グローバルエラーバウンダリ
```typescript
// components/ErrorBoundary.tsx
'use client';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-xl font-semibold mb-2">エラーが発生しました</h2>
          <p className="text-muted-foreground">{this.state.error?.message}</p>
          <Button onClick={() => this.setState({ hasError: false, error: null })}>
            再試行
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 6.2 API エラーレスポンス
```typescript
// lib/api-error.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: unknown): Response {
  console.error('API Error:', error);

  if (error instanceof APIError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return Response.json(
    { error: 'Internal Server Error' },
    { status: 500 }
  );
}
```

---

## 7. テスト戦略

### 7.1 ユニットテスト
- Vitest を使用
- カスタムフック、ユーティリティ関数をテスト

### 7.2 統合テスト
- Playwright を使用
- チャットフロー、設定変更のE2Eテスト

### 7.3 テストファイル構成
```
__tests__/
├── unit/
│   ├── hooks/
│   │   ├── useChat.test.ts
│   │   └── useSession.test.ts
│   └── lib/
│       └── claude/
│           └── client.test.ts
├── integration/
│   ├── api/
│   │   ├── chat.test.ts
│   │   └── sessions.test.ts
└── e2e/
    ├── chat.spec.ts
    └── settings.spec.ts
```

---

## 8. パフォーマンス最適化

### 8.1 コード分割
- 設定ページを動的インポート
- 重いコンポーネント（Markdownレンダラーなど）を遅延読み込み

### 8.2 キャッシュ戦略
- React Query でセッション一覧をキャッシュ
- SWR パターンでバックグラウンド更新

### 8.3 仮想化
- 長いメッセージリストに対して仮想スクロールを実装
- react-virtual を使用

---

## 9. アクセシビリティ

### 9.1 キーボードナビゲーション
- Tab でフォーカス移動
- Enter でメッセージ送信
- Escape でモーダルを閉じる

### 9.2 スクリーンリーダー対応
- 適切な ARIA ラベル
- ライブリージョンでメッセージ更新を通知

### 9.3 カラーコントラスト
- WCAG 2.1 AA 準拠
- ダークモード対応

---

## 10. 実装状況詳細

### 10.1 API実装状況

| エンドポイント | メソッド | 状況 | ファイル |
|---------------|---------|------|----------|
| `/api/chat` | POST | ✅ 実装済 | `src/app/api/chat/route.ts` |
| `/api/chat/approve` | POST | ✅ 実装済 | `src/app/api/chat/approve/route.ts` |
| `/api/sessions` | GET | ✅ 実装済 | `src/app/api/sessions/route.ts` |
| `/api/sessions` | POST | ✅ 実装済 | `src/app/api/sessions/route.ts` |
| `/api/sessions/[id]` | GET | ✅ 実装済 | `src/app/api/sessions/[id]/route.ts` |
| `/api/sessions/[id]` | PATCH | ✅ 実装済 | `src/app/api/sessions/[id]/route.ts` |
| `/api/sessions/[id]` | DELETE | ✅ 実装済 | `src/app/api/sessions/[id]/route.ts` |
| `/api/sessions/[id]/messages` | GET | ✅ 実装済 | `src/app/api/sessions/[id]/messages/route.ts` |
| `/api/settings` | GET | ✅ 実装済 | `src/app/api/settings/route.ts` |
| `/api/settings` | PUT | ✅ 実装済 | `src/app/api/settings/route.ts` |
| `/api/mcp` | GET | ✅ 実装済 | `src/app/api/mcp/route.ts` |
| `/api/mcp` | POST | ✅ 実装済 | `src/app/api/mcp/route.ts` |
| `/api/mcp/[id]` | GET | ✅ 実装済 | `src/app/api/mcp/[id]/route.ts` |
| `/api/mcp/[id]` | PATCH | ✅ 実装済 | `src/app/api/mcp/[id]/route.ts` |
| `/api/mcp/[id]` | DELETE | ✅ 実装済 | `src/app/api/mcp/[id]/route.ts` |
| `/api/agents` | GET | ✅ 実装済 | `src/app/api/agents/route.ts` |
| `/api/agents` | POST | ✅ 実装済 | `src/app/api/agents/route.ts` |
| `/api/agents/[id]` | GET | ✅ 実装済 | `src/app/api/agents/[id]/route.ts` |
| `/api/agents/[id]` | PATCH | ✅ 実装済 | `src/app/api/agents/[id]/route.ts` |
| `/api/agents/[id]` | DELETE | ✅ 実装済 | `src/app/api/agents/[id]/route.ts` |
| `/api/workspace/list` | GET | ✅ 実装済 | `src/app/api/workspace/list/route.ts` |
| `/api/workspace/create` | POST | ✅ 実装済 | `src/app/api/workspace/create/route.ts` |
| `/api/workspace/clone` | POST | ✅ 実装済 | `src/app/api/workspace/clone/route.ts` |
| `/api/workspace/file` | GET | ✅ 実装済 | `src/app/api/workspace/file/route.ts` |
| `/api/workspace/file` | PUT | ✅ 実装済 | `src/app/api/workspace/file/route.ts` |
| `/api/workspace/file/create` | POST | ✅ 実装済 | `src/app/api/workspace/file/create/route.ts` |
| `/api/workspace/file/download` | GET | ✅ 実装済 | `src/app/api/workspace/file/download/route.ts` |
| `/api/workspace/delete` | DELETE | ✅ 実装済 | `src/app/api/workspace/delete/route.ts` |
| `/api/workspace/rename` | POST | ✅ 実装済 | `src/app/api/workspace/rename/route.ts` |
| `/api/workspace/upload` | POST | ✅ 実装済 | `src/app/api/workspace/upload/route.ts` |
| `/api/usage` | GET | ✅ 実装済 | `src/app/api/usage/route.ts` |
| `/api/health` | GET | ✅ 実装済 | `src/app/api/health/route.ts` |
| `/api/models` | GET | ✅ 実装済 | `src/app/api/models/route.ts` |
| `/api/models/custom` | GET | ✅ 実装済 | `src/app/api/models/custom/route.ts` |
| `/api/models/custom` | POST | ✅ 実装済 | `src/app/api/models/custom/route.ts` |
| `/api/models/custom/[id]` | GET | ✅ 実装済 | `src/app/api/models/custom/[id]/route.ts` |
| `/api/models/custom/[id]` | PUT | ✅ 実装済 | `src/app/api/models/custom/[id]/route.ts` |
| `/api/models/custom/[id]` | DELETE | ✅ 実装済 | `src/app/api/models/custom/[id]/route.ts` |

### 10.2 コンポーネント実装状況

#### チャット関連
| コンポーネント | 状況 | ファイル | 備考 |
|---------------|------|----------|------|
| ChatContainer | ✅ 実装済 | `src/components/chat/ChatContainer.tsx` | - |
| ChatHeader | ✅ 実装済 | `src/components/chat/ChatHeader.tsx` | セッションタイトル表示 |
| MessageList | ✅ 実装済 | `src/components/chat/MessageList.tsx` | - |
| MessageItem | ✅ 実装済 | `src/components/chat/MessageItem.tsx` | Markdown対応、ユーザー名・モデル名表示 |
| InputArea | ✅ 実装済 | `src/components/chat/InputArea.tsx` | 権限モード選択統合済み |
| PermissionModeSelector | ✅ 実装済 | `src/components/chat/PermissionModeSelector.tsx` | チャット入力欄上部 |
| ToolApprovalCard | ✅ 実装済 | `src/components/chat/ToolApprovalCard.tsx` | インライン表示、キーボードショートカット対応 |
| ModelSelector | ✅ 実装済 | `src/components/chat/ModelSelector.tsx` | モデル選択ドロップダウン |
| ToolApprovalMessage | ✅ 実装済 | `src/components/chat/MessageItem.tsx` | 承認履歴表示（MessageItem内） |
| ToolCallList | ✅ 実装済 | `src/components/chat/ToolCallList.tsx` | ツール実行ステータス表示 |
| MarkdownRenderer | ✅ 実装済 | `src/components/chat/MarkdownRenderer.tsx` | react-markdown, rehype-highlight使用 |
| ThinkingIndicator | ✅ 実装済 | `src/components/chat/MessageItem.tsx`, `src/components/ui/collapsible.tsx` | 思考過程表示（折りたたみ対応） |
| MessageSearch | ✅ 実装済 | `src/components/chat/MessageSearch.tsx` | Cmd/Ctrl+Fで開く、マッチ間ナビゲーション |
| HighlightedText | ✅ 実装済 | `src/components/chat/HighlightedText.tsx` | 検索キーワードハイライト表示 |

#### サイドバー関連
| コンポーネント | 状況 | ファイル | 備考 |
|---------------|------|----------|------|
| Sidebar | ✅ 実装済 | `src/components/sidebar/Sidebar.tsx` | 横幅調整対応、使用量ボタン |
| SessionList | ✅ 実装済 | `src/components/sidebar/SessionList.tsx` | 差分ロード対応 |
| SessionItem | ✅ 実装済 | `src/components/sidebar/SessionItem.tsx` | メニュー付き、削除確認AlertDialog |
| SessionSearch | ✅ 実装済 | `src/components/sidebar/SessionSearch.tsx` | セッション検索（タイトル・メッセージ内容・モデル名） |

#### 設定関連
| コンポーネント | 状況 | ファイル | 備考 |
|---------------|------|----------|------|
| SettingsLayout | ✅ 実装済 | `src/app/settings/layout.tsx` | 設定ページレイアウト |
| SettingsPage | ✅ 実装済 | `src/app/settings/page.tsx` | 権限モード、デフォルトツール、外観設定 |
| PermissionModeRadioGroup | ✅ 実装済 | `src/components/settings/PermissionModeRadioGroup.tsx` | 設定画面用 |
| DefaultToolsCheckboxGroup | ✅ 実装済 | `src/components/settings/DefaultToolsCheckboxGroup.tsx` | カテゴリ別ツール選択 |
| SandboxSettingsForm | ✅ 実装済 | `src/components/settings/SandboxSettingsForm.tsx` | サンドボックス設定（有効/無効、ワークスペースパス） |
| AppearanceSettingsForm | ✅ 実装済 | `src/components/settings/AppearanceSettingsForm.tsx` | 外観設定（アイコン、表示名） |
| ModelsPage | ✅ 実装済 | `src/app/settings/models/page.tsx` | カスタムモデル管理ページ |
| CustomModelCard | ✅ 実装済 | `src/components/settings/CustomModelCard.tsx` | カスタムモデルカード表示 |
| CustomModelForm | ✅ 実装済 | `src/components/settings/CustomModelForm.tsx` | カスタムモデル作成・編集フォーム |
| IconPicker | ✅ 実装済 | `src/components/settings/IconPicker.tsx` | アイコン・画像選択UI |
| MCPConfig | ❌ 未実装 | - | MCP設定UI（APIは実装済み） |
| AgentsConfig | ❌ 未実装 | - | Subagent設定UI（APIは実装済み） |
| SkillsConfig | ❌ 未実装 | - | Skills設定 |

#### ワークスペース関連
| コンポーネント | 状況 | ファイル | 備考 |
|---------------|------|----------|------|
| WorkspaceBadge | ✅ 実装済 | `src/components/workspace/WorkspaceBadge.tsx` | ChatHeaderに表示 |
| WorkspaceSelector | ✅ 実装済 | `src/components/workspace/WorkspaceSelector.tsx` | セッションごとにワークスペース設定 |
| WorkspaceTree | ✅ 実装済 | `src/components/workspace/WorkspaceTree.tsx` | ディレクトリツリー表示 |
| WorkspaceTreeItem | ✅ 実装済 | `src/components/workspace/WorkspaceTreeItem.tsx` | ツリーアイテム |
| FileBrowserTree | ✅ 実装済 | `src/components/workspace/FileBrowserTree.tsx` | ファイルブラウザツリー |
| FileBrowserItem | ✅ 実装済 | `src/components/workspace/FileBrowserItem.tsx` | ファイルブラウザ項目（展開、アクション） |
| FilePreview | ✅ 実装済 | `src/components/workspace/FilePreview.tsx` | ファイルプレビュー・編集（画像プレビュー対応） |

#### 共通UI
| コンポーネント | 状況 | ファイル | 備考 |
|---------------|------|----------|------|
| Button | ✅ 実装済 | `src/components/ui/button.tsx` | shadcn/ui |
| Input | ✅ 実装済 | `src/components/ui/input.tsx` | shadcn/ui |
| Textarea | ✅ 実装済 | `src/components/ui/textarea.tsx` | shadcn/ui |
| ScrollArea | ✅ 実装済 | `src/components/ui/scroll-area.tsx` | shadcn/ui |
| Avatar | ✅ 実装済 | `src/components/ui/avatar.tsx` | shadcn/ui |
| Card | ✅ 実装済 | `src/components/ui/card.tsx` | shadcn/ui |
| Dialog | ✅ 実装済 | `src/components/ui/dialog.tsx` | shadcn/ui |
| Select | ✅ 実装済 | `src/components/ui/select.tsx` | shadcn/ui |
| DropdownMenu | ✅ 実装済 | `src/components/ui/dropdown-menu.tsx` | shadcn/ui |
| Tabs | ✅ 実装済 | `src/components/ui/tabs.tsx` | shadcn/ui |
| Badge | ✅ 実装済 | `src/components/ui/badge.tsx` | shadcn/ui |
| Tooltip | ✅ 実装済 | `src/components/ui/tooltip.tsx` | shadcn/ui |
| Sheet | ✅ 実装済 | `src/components/ui/sheet.tsx` | shadcn/ui |
| Skeleton | ✅ 実装済 | `src/components/ui/skeleton.tsx` | shadcn/ui |
| ToggleGroup | ✅ 実装済 | `src/components/ui/toggle-group.tsx` | shadcn/ui |
| RadioGroup | ✅ 実装済 | `src/components/ui/radio-group.tsx` | shadcn/ui |
| Label | ✅ 実装済 | `src/components/ui/label.tsx` | shadcn/ui |
| Checkbox | ✅ 実装済 | `src/components/ui/checkbox.tsx` | shadcn/ui |
| Separator | ✅ 実装済 | `src/components/ui/separator.tsx` | shadcn/ui |
| Popover | ✅ 実装済 | `src/components/ui/popover.tsx` | shadcn/ui |
| Switch | ✅ 実装済 | `src/components/ui/switch.tsx` | shadcn/ui |
| Toast | ❌ 未実装 | - | 通知 |

### 10.3 カスタムフック実装状況

| フック | 状況 | ファイル | 備考 |
|-------|------|----------|------|
| useChat | ✅ 実装済 | `src/hooks/useChat.ts` | React Query使用、permissionMode対応、ツール承認対応 |
| useSessions | ✅ 実装済 | `src/hooks/useSessions.ts` | セッション一覧取得、差分ロード対応 |
| useSettings | ✅ 実装済 | `src/hooks/useSettings.ts` | 設定管理、デフォルトツール対応 |
| useUsage | ✅ 実装済 | `src/hooks/useUsage.ts` | Claude Code使用量取得 |
| useModels | ✅ 実装済 | `src/hooks/useModels.ts` | モデル管理（標準・カスタム） |
| useSessionSearch | ✅ 実装済 | `src/hooks/useSessionSearch.ts` | セッション検索（デバウンス付き） |
| useMCP | ❌ 未実装 | - | MCP管理（APIは実装済み） |
| useAgents | ❌ 未実装 | - | エージェント管理（APIは実装済み） |

### 10.4 ページ実装状況

| ページ | 状況 | ファイル | 備考 |
|-------|------|----------|------|
| ルート | ✅ 実装済 | `src/app/page.tsx` | /chatへリダイレクト |
| 新規チャット | ✅ 実装済 | `src/app/chat/page.tsx` | - |
| セッションチャット | ✅ 実装済 | `src/app/chat/[sessionId]/page.tsx` | - |
| チャットレイアウト | ✅ 実装済 | `src/app/chat/layout.tsx` | サイドバー付き |
| 設定メイン | ✅ 実装済 | `src/app/settings/page.tsx` | 権限モード、デフォルトツール、外観設定 |
| 設定レイアウト | ✅ 実装済 | `src/app/settings/layout.tsx` | - |
| モデル設定 | ✅ 実装済 | `src/app/settings/models/page.tsx` | カスタムモデル管理 |
| 使用量表示 | ✅ 実装済 | `src/app/usage/page.tsx` | 5時間/7日間使用量 |
| 使用量レイアウト | ✅ 実装済 | `src/app/usage/layout.tsx` | - |
| ファイルブラウザ | ✅ 実装済 | `src/app/files/page.tsx` | ファイル一覧・プレビュー・編集 |
| ファイルレイアウト | ✅ 実装済 | `src/app/files/layout.tsx` | - |
| MCP設定 | ❌ 未実装 | - | APIは実装済み |
| Subagent設定 | ❌ 未実装 | - | APIは実装済み |
| Skills設定 | ❌ 未実装 | - | - |

### 10.5 データベーステーブル状況

| テーブル | 状況 | 使用状況 |
|---------|------|----------|
| Session | ✅ 作成済 | ✅ 使用中（チャットセッション、allowedTools） |
| Message | ✅ 作成済 | ✅ 使用中（チャットメッセージ） |
| MCPServer | ✅ 作成済 | ✅ 使用中（API経由でCRUD可能） |
| Agent | ✅ 作成済 | ✅ 使用中（API経由でCRUD可能） |
| Settings | ✅ 作成済 | ✅ 使用中（権限モード、デフォルトツール） |

### 10.6 既知の課題・制限事項

1. **設定UI未実装**
   - MCP、エージェントの設定がUIから行えない（APIは実装済み）
   - Skills設定UIが未実装

2. **エラーハンドリング不十分**
   - エラー時のユーザーフィードバックが限定的
   - グローバルエラーバウンダリ未実装
   - Toast通知コンポーネントが未実装

3. **入力バリデーション未対応**
   - API入力のZodスキーマによるバリデーションが未実装

#### 実装済み機能（参考）

- ✅ **Markdownレンダリング**: react-markdown, rehype-highlight使用（`MarkdownRenderer.tsx`）
- ✅ **ツール実行結果表示**: [13章参照](#13-ツール実行ステータス表示設計)
- ✅ **権限制御**: [11章参照](#11-権限モード切替ui設計)
- ✅ **ツール実行確認**: [12章参照](#12-ツール実行確認ui設計)
- ✅ **MCP/エージェントAPI**: GET/POST/PATCH/DELETE完全実装
- ✅ **ワークスペース選択機能**: セッションごとにワークスペース設定可能
- ✅ **使用量表示機能**: Claude Code使用量（5時間/7日間）表示
- ✅ **拡張思考（Thinking）表示**: thinking_deltaストリーミング対応、折りたたみ表示（`collapsible.tsx`）
- ✅ **外観設定機能**: ユーザー/Claudeアイコンのカスタマイズ
- ✅ **ユーザー名・モデル名表示**: メッセージにユーザー名・モデル名を表示
- ✅ **セッション検索**: タイトル・メッセージ内容・モデル名でセッション検索（`SessionSearch.tsx`, `useSessionSearch.ts`）
- ✅ **メッセージ内検索**: Cmd/Ctrl+Fでチャット内検索、マッチ間ナビゲーション、ハイライト表示（`MessageSearch.tsx`, `MessageSearchContext.tsx`）

---

## 11. 権限モード切替UI設計

### 11.1 概要

権限モード（PermissionMode）は、Claude Agent SDKがツール実行時にどのように権限を扱うかを制御する設定です。

| モード | 説明 |
|--------|------|
| `default` | 各ツール実行前にユーザー確認を求める（最も安全） |
| `acceptEdits` | ファイル編集は自動許可、その他は確認を求める |
| `bypassPermissions` | すべてのツール実行を自動許可（最も自由） |
| `plan` | 計画モード：実行せず計画のみ作成 |

### 11.2 機能要件

1. **設定画面でのデフォルト設定**
   - 一般設定ページでデフォルトの権限モードを選択可能
   - 設定はDBに永続化され、次回起動時も維持

2. **チャット画面での即時切替**
   - テキスト入力欄の上部に権限モード選択UIを配置
   - 各メッセージ送信時に選択中のモードを適用
   - デフォルト値は設定画面で設定した値

3. **視覚的フィードバック**
   - 現在の権限モードを明確に表示
   - 危険度の高いモード（bypassPermissions）は警告色で表示

### 11.3 UI設計

#### 11.3.1 チャット入力エリア上部のモード選択UI

```
┌─────────────────────────────────────────────────────────────┐
│  [🛡️ default ▼] [📝 acceptEdits] [⚡ bypass] [📋 plan]     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  メッセージを入力...                                │   │
│  │                                                     │   │
│  │                                          [送信]     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 11.3.2 設定画面のデフォルトモード設定

```
┌─────────────────────────────────────────────────────────────┐
│  一般設定                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  デフォルト権限モード                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ○ Default (推奨)                                   │   │
│  │    各ツール実行前に確認を求めます                    │   │
│  │                                                     │   │
│  │  ○ Accept Edits                                     │   │
│  │    ファイル編集は自動許可、その他は確認             │   │
│  │                                                     │   │
│  │  ○ Bypass Permissions ⚠️                            │   │
│  │    すべてのツール実行を自動許可                      │   │
│  │                                                     │   │
│  │  ○ Plan                                             │   │
│  │    計画モード：実行せず計画のみ作成                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                          [保存]             │
└─────────────────────────────────────────────────────────────┘
```

### 11.4 コンポーネント設計

#### 11.4.1 PermissionModeSelector（チャット用）

```typescript
// components/chat/PermissionModeSelector.tsx
interface PermissionModeSelectorProps {
  value: PermissionMode;
  onChange: (mode: PermissionMode) => void;
  defaultMode?: PermissionMode;
}

export function PermissionModeSelector({
  value,
  onChange,
  defaultMode = 'default'
}: PermissionModeSelectorProps) {
  const modes: {
    value: PermissionMode;
    label: string;
    icon: string;
    description: string;
    variant: 'default' | 'warning' | 'destructive';
  }[] = [
    {
      value: 'default',
      label: 'Default',
      icon: '🛡️',
      description: '各ツール実行前に確認',
      variant: 'default'
    },
    {
      value: 'acceptEdits',
      label: 'Accept Edits',
      icon: '📝',
      description: 'ファイル編集は自動許可',
      variant: 'default'
    },
    {
      value: 'bypassPermissions',
      label: 'Bypass',
      icon: '⚡',
      description: 'すべて自動許可',
      variant: 'destructive'
    },
    {
      value: 'plan',
      label: 'Plan',
      icon: '📋',
      description: '計画のみ作成',
      variant: 'default'
    }
  ];

  return (
    <div className="flex items-center gap-1 p-2 border-b">
      <span className="text-xs text-muted-foreground mr-2">権限:</span>
      <ToggleGroup type="single" value={value} onValueChange={onChange}>
        {modes.map((mode) => (
          <ToggleGroupItem
            key={mode.value}
            value={mode.value}
            aria-label={mode.description}
            className={cn(
              "text-xs px-2 py-1",
              mode.variant === 'destructive' && value === mode.value && "bg-destructive/10 text-destructive"
            )}
          >
            <span className="mr-1">{mode.icon}</span>
            {mode.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {value !== defaultMode && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-6 px-2"
          onClick={() => onChange(defaultMode)}
        >
          リセット
        </Button>
      )}
    </div>
  );
}
```

#### 11.4.2 PermissionModeRadioGroup（設定画面用）

```typescript
// components/settings/PermissionModeRadioGroup.tsx
interface PermissionModeRadioGroupProps {
  value: PermissionMode;
  onChange: (mode: PermissionMode) => void;
}

export function PermissionModeRadioGroup({
  value,
  onChange
}: PermissionModeRadioGroupProps) {
  const modes = [
    {
      value: 'default' as const,
      label: 'Default',
      description: '各ツール実行前に確認を求めます。最も安全なモードです。',
      recommended: true
    },
    {
      value: 'acceptEdits' as const,
      label: 'Accept Edits',
      description: 'ファイルの読み書きは自動許可し、その他のツール実行は確認を求めます。'
    },
    {
      value: 'bypassPermissions' as const,
      label: 'Bypass Permissions',
      description: 'すべてのツール実行を自動許可します。信頼できる環境でのみ使用してください。',
      warning: true
    },
    {
      value: 'plan' as const,
      label: 'Plan',
      description: '計画モード。実際のツール実行は行わず、計画のみを作成します。'
    }
  ];

  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
      {modes.map((mode) => (
        <div key={mode.value} className="flex items-start space-x-3">
          <RadioGroupItem value={mode.value} id={mode.value} className="mt-1" />
          <Label htmlFor={mode.value} className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="font-medium">{mode.label}</span>
              {mode.recommended && (
                <Badge variant="secondary" className="text-xs">推奨</Badge>
              )}
              {mode.warning && (
                <Badge variant="destructive" className="text-xs">⚠️ 注意</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {mode.description}
            </p>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
```

#### 11.4.3 InputArea の更新

```typescript
// components/chat/InputArea.tsx (更新版)
interface InputAreaProps {
  onSubmit: (message: string, options?: { permissionMode?: PermissionMode }) => void;
  disabled?: boolean;
  defaultPermissionMode?: PermissionMode;
}

export function InputArea({
  onSubmit,
  disabled,
  defaultPermissionMode = 'default'
}: InputAreaProps) {
  const [input, setInput] = useState('');
  const [permissionMode, setPermissionMode] = useState<PermissionMode>(defaultPermissionMode);

  // デフォルト値が変更されたら追従
  useEffect(() => {
    setPermissionMode(defaultPermissionMode);
  }, [defaultPermissionMode]);

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    onSubmit(input, { permissionMode });
    setInput('');
  };

  return (
    <div className="border-t">
      <PermissionModeSelector
        value={permissionMode}
        onChange={setPermissionMode}
        defaultMode={defaultPermissionMode}
      />
      <div className="p-4">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            className="min-h-[60px] resize-none pr-12"
            disabled={disabled}
          />
          <Button
            size="icon"
            className="absolute right-2 bottom-2"
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 11.5 データフロー

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Settings DB   │────►│   useSettings   │────►│   InputArea     │
│ (defaultMode)   │     │   (React Query) │     │ (defaultMode)   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │ PermissionMode  │
                                                │   Selector      │
                                                │ (currentMode)   │
                                                └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   /api/chat     │◄────│    useChat      │◄────│   送信ボタン    │
│ (permissionMode)│     │  (sendMessage)  │     │  クリック       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Claude Agent SDK│
│ query({ options:│
│  permissionMode │
│ })              │
└─────────────────┘
```

### 11.6 API変更

#### 11.6.1 POST /api/chat リクエスト更新

```typescript
interface ChatRequest {
  message: string;
  sessionId?: string;
  settings?: {
    permissionMode?: PermissionMode;  // 追加
    model?: string;
    allowedTools?: string[];
    disallowedTools?: string[];
    // ... 他の設定
  };
}
```

#### 11.6.2 GET/PUT /api/settings

```typescript
// GET /api/settings レスポンス
interface SettingsResponse {
  general: {
    defaultPermissionMode: PermissionMode;  // 追加
    defaultModel: string;
    theme: 'light' | 'dark' | 'system';
    language: 'ja' | 'en';
  };
  // ... 他の設定
}

// PUT /api/settings リクエスト
interface UpdateSettingsRequest {
  general?: {
    defaultPermissionMode?: PermissionMode;  // 追加
    // ... 他の設定
  };
  // ... 他の設定
}
```

### 11.7 実装ファイル一覧

| ファイル | 種別 | 説明 |
|---------|------|------|
| `src/components/chat/PermissionModeSelector.tsx` | 新規 | チャット用権限モード選択UI |
| `src/components/settings/PermissionModeRadioGroup.tsx` | 新規 | 設定画面用ラジオグループ |
| `src/components/chat/InputArea.tsx` | 更新 | 権限モード選択を統合 |
| `src/app/settings/page.tsx` | 新規 | 設定メインページ |
| `src/app/api/settings/route.ts` | 新規 | 設定API |
| `src/hooks/useSettings.ts` | 新規 | 設定管理フック |
| `src/types/index.ts` | 更新 | PermissionMode型追加 |
| `src/components/ui/toggle-group.tsx` | 新規 | shadcn/ui ToggleGroup |
| `src/components/ui/radio-group.tsx` | 新規 | shadcn/ui RadioGroup |
| `src/components/ui/badge.tsx` | 新規 | shadcn/ui Badge |

### 11.8 実装順序

1. **Phase 1: UI基盤**
   - shadcn/ui コンポーネント追加（toggle-group, radio-group, badge）
   - 型定義の更新

2. **Phase 2: チャット画面**
   - PermissionModeSelector コンポーネント作成
   - InputArea への統合
   - useChat フックの更新（permissionMode送信対応）
   - /api/chat の更新

3. **Phase 3: 設定画面**
   - /api/settings API作成
   - useSettings フック作成
   - PermissionModeRadioGroup コンポーネント作成
   - 設定ページ作成

4. **Phase 4: 統合**
   - 設定画面のデフォルト値をチャット画面に反映
   - エラーハンドリング追加

---

## 12. ツール実行確認UI設計

### 12.1 概要

`permissionMode: 'default'`の場合、Claude Agent SDKはツール実行前にユーザー確認を求めます。
この機能により、ユーザーはツール実行を以下から選択できます：

| 選択肢 | 説明 | スコープ |
|--------|------|----------|
| **許可 (Allow)** | このツール実行を1回だけ許可 | 1回のみ |
| **拒否 (Deny)** | このツール実行を拒否 | 1回のみ |
| **常に許可 (Always)** | このツールを以後自動許可 | セッション内限定 |

### 12.2 機能要件

1. **ツール実行確認ダイアログ**
   - ツール名と入力パラメータを表示
   - 許可/拒否/常に許可の3択を提示
   - 確認待ち中は他の操作をブロック

2. **「常に許可」のスコープ** ✅ 実装済み（DB永続化）
   - **セッション単位でDBに保存**: Session.allowedTools フィールドに保存
   - ブラウザリロードしても維持される
   - セッション切替時は別のallowedToolsを使用
   - ツール名単位で記憶

3. **視覚的フィードバック**
   - 危険なツール（Bash等）は警告表示
   - 確認待ち中はローディング表示
   - 常に許可済みツールは自動でスキップ

### 12.3 アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │ ToolApproval    │    │ useChat Hook                        │ │
│  │ Dialog          │◄───│ - pendingToolApproval state        │ │
│  │                 │    │ - alwaysAllowedTools (Set<string>) │ │
│  │ [許可][拒否]    │    │ - respondToToolApproval()          │ │
│  │ [常に許可]      │───►│                                     │ │
│  └─────────────────┘    └──────────────┬──────────────────────┘ │
│                                         │                        │
│                                         │ POST /api/chat/approve │
│                                         ▼                        │
├─────────────────────────────────────────────────────────────────┤
│                        Server (API Routes)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ /api/chat/route.ts                                          │ │
│  │                                                              │ │
│  │  query({                                                     │ │
│  │    options: {                                                │ │
│  │      canUseTool: async (toolName, input) => {               │ │
│  │        // SSEで確認リクエスト送信                            │ │
│  │        sendEvent({ type: 'tool_approval_request', ... })    │ │
│  │                                                              │ │
│  │        // クライアントからの応答を待機                       │ │
│  │        const response = await waitForApproval(requestId)    │ │
│  │                                                              │ │
│  │        return response.approved                              │ │
│  │          ? { behavior: 'allow', updatedInput: input }       │ │
│  │          : { behavior: 'deny', message: 'User denied' }     │ │
│  │      }                                                       │ │
│  │    }                                                         │ │
│  │  })                                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ /api/chat/approve/route.ts (新規)                           │ │
│  │                                                              │ │
│  │  POST: ユーザーの応答を受け取り、待機中のPromiseを解決      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 12.4 通信フロー

```
Client                          Server                      Claude SDK
   │                               │                              │
   │  POST /api/chat              │                              │
   │  (message, permissionMode)   │                              │
   │──────────────────────────────►│                              │
   │                               │  query({ canUseTool })       │
   │                               │─────────────────────────────►│
   │                               │                              │
   │                               │    canUseTool(toolName, input)
   │                               │◄─────────────────────────────│
   │                               │                              │
   │  SSE: tool_approval_request  │                              │
   │  { requestId, toolName, ... }│                              │
   │◄──────────────────────────────│  (waiting for response...)   │
   │                               │                              │
   │  [User clicks "Allow"]       │                              │
   │                               │                              │
   │  POST /api/chat/approve      │                              │
   │  { requestId, approved: true }                              │
   │──────────────────────────────►│                              │
   │                               │  resolve({ behavior: 'allow' })
   │                               │─────────────────────────────►│
   │                               │                              │
   │  SSE: tool_use               │      (tool executes)         │
   │◄──────────────────────────────│◄─────────────────────────────│
   │                               │                              │
```

### 12.5 型定義

```typescript
// types/chat.ts に追加

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

/** ChatEventに追加 */
export type ChatEvent =
  | { type: 'init'; sessionId: string; claudeSessionId: string }
  | { type: 'message'; content: string; role: 'assistant' }
  | { type: 'tool_use'; toolName: string; toolInput: unknown; toolUseId: string }
  | { type: 'tool_result'; toolName: string; result: unknown; toolUseId: string }
  | { type: 'tool_approval_request'; request: ToolApprovalRequest }  // 追加
  | { type: 'tool_approval_resolved'; requestId: string }            // 追加
  | { type: 'thinking'; content: string }
  | { type: 'done'; result: string; usage: MessageMetadata['usage'] }
  | { type: 'error'; message: string };
```

### 12.6 UI設計

#### 12.6.1 ツール確認カード（インライン表示）

チャット履歴内にカード形式でインライン表示される。モーダルダイアログではなく、メッセージの一部として表示。

```
┌─────────────────────────────────────────────────────────────────┐
│  🛡️ ツール実行確認: [WebSearch] ⚠️ 危険                        │
│  ─────────────────────────────────────────────────────────────  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  {                                                        │  │
│  │    "query": "今日の株価"                                  │  │
│  │  }                                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────┐              ┌─────────┐  ┌─────────────────────┐  │
│  │ 拒否 [d]│              │ 許可 [a]│  │   常に許可 [y]      │  │
│  └─────────┘              └─────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

決定後はボタンが消え、結果が表示される：
- ✅ 許可（緑）
- ✅ 常に許可（青）
- ❌ 拒否（赤）

#### 12.6.2 キーボードショートカット

| キー | アクション |
|------|-----------|
| `a` | 許可 |
| `y` | 常に許可 |
| `d` または `Escape` | 拒否 |

#### 12.6.3 危険度レベル

| ツール | 危険度 | 表示 |
|--------|--------|------|
| Bash, KillShell | 高 | ⚠️ 危険ラベル表示 |
| Write, Edit | 中 | 通常表示 |
| Read, Glob, Grep | 低 | 通常表示 |

### 12.7 コンポーネント設計

#### 12.7.1 ToolApprovalCard（インラインカード）

```typescript
// components/chat/ToolApprovalCard.tsx
interface ToolApprovalCardProps {
  request: ToolApprovalRequest;
  onRespond: (response: ToolApprovalResponse) => void;
}

export function ToolApprovalCard({ request, onRespond }: ToolApprovalCardProps) {
  const handleDecision = useCallback(
    (decision: ToolApprovalResponse['decision']) => {
      onRespond({ requestId: request.requestId, decision });
    },
    [request.requestId, onRespond]
  );

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'a': handleDecision('allow'); break;
        case 'y': handleDecision('always'); break;
        case 'd':
        case 'escape': handleDecision('deny'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDecision]);

  return (
    <Card className="mx-4 my-2 border-amber-500/50 bg-amber-500/5">
      <CardHeader>
        <CardTitle>ツール実行の確認</CardTitle>
      </CardHeader>
      <CardContent>
        <div>ツール名: {request.toolName}</div>
        <pre>{JSON.stringify(request.toolInput, null, 2)}</pre>
      </CardContent>
      <CardFooter>
        <Button onClick={() => handleDecision('deny')}>拒否 [d]</Button>
        <Button onClick={() => handleDecision('allow')}>許可 [a]</Button>
        <Button onClick={() => handleDecision('always')}>常に許可 [y]</Button>
      </CardFooter>
    </Card>
  );
}
```

#### 12.7.2 ToolApprovalMessage（履歴表示）

決定後のメッセージ表示用コンポーネント（MessageItem内で使用）：

```typescript
// MessageItem.tsx 内
function ToolApprovalMessage({ message }: { message: Message }) {
  const approval = message.toolApproval!;
  const decision = approval.decision;

  const getDecisionInfo = () => {
    switch (decision) {
      case 'allow': return { icon: ShieldCheck, text: '許可', color: 'text-green-600' };
      case 'always': return { icon: ShieldCheck, text: '常に許可', color: 'text-blue-600' };
      case 'deny': return { icon: ShieldX, text: '拒否', color: 'text-red-600' };
      default: return { icon: ShieldAlert, text: '待機中...', color: 'text-amber-600' };
    }
  };

  return (
    <div className={cn('flex gap-4 p-4', bg)}>
      {/* ツール名、入力内容、決定結果を表示 */}
    </div>
  );
}
```

#### 12.7.3 useChat フックの更新

```typescript
// hooks/useChat.ts

interface UseChatReturn {
  // ... 既存のプロパティ
  pendingToolApproval: ToolApprovalRequest | null;
  respondToToolApproval: (response: ToolApprovalResponse) => Promise<void>;
}

// tool_approval_request イベント受信時
case 'tool_approval_request':
  setPendingToolApproval(event.request);
  // メッセージとして追加（履歴に残す）
  setMessages((prev) => [
    ...prev,
    {
      id: event.request.requestId,
      role: 'tool_approval',
      content: '',
      toolApproval: {
        requestId: event.request.requestId,
        toolName: event.request.toolName,
        toolInput: event.request.toolInput,
        isDangerous: event.request.isDangerous,
      },
      createdAt: new Date().toISOString(),
    },
  ]);
  break;

// 承認応答時
const respondToToolApproval = useCallback(async (response: ToolApprovalResponse) => {
  // メッセージを更新（決定結果を追加）
  setMessages((prev) =>
    prev.map((msg) =>
      msg.id === response.requestId && msg.toolApproval
        ? {
            ...msg,
            toolApproval: {
              ...msg.toolApproval,
              decision: response.decision,
              decidedAt: new Date().toISOString(),
            },
          }
        : msg
    )
  );

  await fetch('/api/chat/approve', { ... });
}, []);

  // SSEイベント処理に追加
  // case 'tool_approval_request':
  //   const request = event.request;
  //   // 常に許可済みならスキップ
  //   if (alwaysAllowedToolsRef.current.has(request.toolName)) {
  //     respondToToolApproval('allow');
  //   } else {
  //     setPendingToolApproval(request);
  //   }
  //   break;

  // セッション切替時にリセット
  useEffect(() => {
    alwaysAllowedToolsRef.current.clear();
    setPendingToolApproval(null);
  }, [sessionId]);

  return {
    // ... 既存のプロパティ
    pendingToolApproval,
    respondToToolApproval,
  };
}
```

### 12.8 サーバー側実装

#### 12.8.1 承認待機マネージャー

```typescript
// lib/approval-manager.ts

type ApprovalResolver = (response: ToolApprovalResponse) => void;

class ApprovalManager {
  private pendingApprovals = new Map<string, ApprovalResolver>();

  waitForApproval(requestId: string): Promise<ToolApprovalResponse> {
    return new Promise((resolve) => {
      this.pendingApprovals.set(requestId, resolve);

      // タイムアウト（5分）
      setTimeout(() => {
        if (this.pendingApprovals.has(requestId)) {
          this.pendingApprovals.delete(requestId);
          resolve({ requestId, decision: 'deny' });
        }
      }, 5 * 60 * 1000);
    });
  }

  resolveApproval(requestId: string, response: ToolApprovalResponse): boolean {
    const resolver = this.pendingApprovals.get(requestId);
    if (resolver) {
      resolver(response);
      this.pendingApprovals.delete(requestId);
      return true;
    }
    return false;
  }
}

export const approvalManager = new ApprovalManager();
```

#### 12.8.2 /api/chat/approve/route.ts

```typescript
// app/api/chat/approve/route.ts

import { NextResponse } from 'next/server';
import { approvalManager } from '@/lib/approval-manager';
import type { ToolApprovalResponse } from '@/types';

export async function POST(request: Request) {
  const body = await request.json() as ToolApprovalResponse;
  const { requestId, decision } = body;

  const resolved = approvalManager.resolveApproval(requestId, { requestId, decision });

  if (!resolved) {
    return NextResponse.json(
      { error: 'Approval request not found or expired' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
```

#### 12.8.3 /api/chat/route.ts の更新

```typescript
// canUseTool コールバックを追加

const queryOptions = {
  prompt: message,
  options: {
    // ... 既存のオプション
    canUseTool: async (toolName: string, input: unknown) => {
      const requestId = generateUUID();

      // クライアントに確認リクエストを送信
      sendEvent({
        type: 'tool_approval_request',
        request: {
          requestId,
          toolName,
          toolInput: input,
          isDangerous: ['Bash', 'KillShell'].includes(toolName),
        },
      });

      // クライアントからの応答を待機
      const response = await approvalManager.waitForApproval(requestId);

      sendEvent({
        type: 'tool_approval_resolved',
        requestId,
      });

      if (response.decision === 'allow' || response.decision === 'always') {
        return { behavior: 'allow', updatedInput: input };
      } else {
        return { behavior: 'deny', message: 'User denied permission' };
      }
    },
  },
};
```

### 12.9 実装ファイル一覧

| ファイル | 種別 | 状況 | 説明 |
|---------|------|------|------|
| `src/types/chat.ts` | 更新 | ✅ 実装済 | ToolApprovalRequest/Response/Info型追加、Message.role拡張 |
| `src/lib/approval-manager.ts` | 新規 | ✅ 実装済 | 承認待機マネージャー |
| `src/app/api/chat/route.ts` | 更新 | ✅ 実装済 | options内にcanUseToolコールバック追加 |
| `src/app/api/chat/approve/route.ts` | 新規 | ✅ 実装済 | 承認API |
| `src/components/chat/ToolApprovalCard.tsx` | 新規 | ✅ 実装済 | インライン確認カード（キーボードショートカット対応） |
| `src/components/chat/MessageItem.tsx` | 更新 | ✅ 実装済 | ToolApprovalMessage追加（履歴表示） |
| `src/components/chat/MessageList.tsx` | 更新 | ✅ 実装済 | ToolApprovalCard統合 |
| `src/hooks/useChat.ts` | 更新 | ✅ 実装済 | 確認状態管理、メッセージ履歴追加 |
| `src/components/chat/ChatContainer.tsx` | 更新 | ✅ 実装済 | カード統合 |

### 12.10 実装順序

1. **Phase 1: 型定義とマネージャー** ✅ 完了
   - 型定義の追加（ToolApprovalInfo、Message.role拡張）
   - ApprovalManager作成

2. **Phase 2: サーバー側** ✅ 完了
   - /api/chat/approve API作成
   - /api/chat に canUseTool 追加（options内に配置）

3. **Phase 3: クライアント側** ✅ 完了
   - ToolApprovalCard作成（インライン表示、キーボードショートカット対応）
   - ToolApprovalMessage作成（履歴表示）
   - useChat に確認状態管理・メッセージ履歴追加
   - MessageList/ChatContainer にカード統合

4. **Phase 4: 統合テスト** ✅ 完了
   - permissionMode: 'default' での動作確認
   - 「常に許可」のセッション内限定確認
   - 承認履歴のチャット表示確認

---

## 13. ツール実行ステータス表示設計

### 13.1 概要

Claude Code CLIと同様に、ツール実行時のステータス（「検索中」「編集中」など）をリアルタイムで表示する機能。

### 13.2 機能要件

1. **ステータス表示**
   - `running`: ツール実行中（スピナーアイコン）
   - `completed`: 実行完了（チェックアイコン、緑色）
   - `failed`: 実行失敗（エラーアイコン、赤色）

2. **イベントフロー**
   ```
   SDK assistant message → tool_use event (status: running)
                        ↓
   SDK user message (tool_result) → tool_result event (status: completed)
   ```

3. **メッセージ管理**
   - ツール実行後は新しいメッセージを作成（既存メッセージに追加しない）
   - `assistantMessageId` をリセットして正しい順序を維持

### 13.3 実装アーキテクチャ

#### 13.3.1 サーバー側（route.ts）

```typescript
// processSDKMessage を配列を返すように変更
function processSDKMessage(msg: SDKMessage): ChatEvent[] {
  const events: ChatEvent[] = [];

  switch (msg.type) {
    case 'assistant': {
      // テキストコンテンツ処理
      const textContent = content
        .filter((c) => c.type === 'text' && c.text)
        .map((c) => c.text!)
        .join('');

      if (textContent) {
        events.push({ type: 'message', content: textContent, role: 'assistant' });
      }

      // ツール使用イベント
      const toolUses = content.filter((c) => c.type === 'tool_use');
      for (const toolUse of toolUses) {
        events.push({
          type: 'tool_use',
          toolName: toolUse.name!,
          toolInput: toolUse.input,
          toolUseId: toolUse.id!,
        });
      }
      break;
    }

    case 'user': {
      // ツール結果イベント
      const toolResults = content.filter((c) => c.type === 'tool_result');
      for (const toolResult of toolResults) {
        events.push({
          type: 'tool_result',
          toolName: '',
          result: toolResult.content,
          toolUseId: toolResult.tool_use_id!,
        });
      }
      break;
    }
  }

  return events;
}
```

#### 13.3.2 クライアント側（useChat.ts）

```typescript
// tool_use イベント処理
case 'tool_use': {
  if (!assistantMessageId) {
    assistantMessageId = generateUUID();
  }
  const newToolCall: ToolCall = {
    id: event.toolUseId,
    name: event.toolName,
    input: event.toolInput,
    status: 'running',  // 実行中ステータス
  };
  setMessages((prev) => {
    const existingIndex = prev.findIndex((m) => m.id === assistantMessageId);
    if (existingIndex !== -1) {
      const existingToolCalls = prev[existingIndex].toolCalls || [];
      const updated = [...prev];
      updated[existingIndex] = {
        ...updated[existingIndex],
        toolCalls: [...existingToolCalls, newToolCall],
      };
      return updated;
    }
    return [
      ...prev,
      {
        id: assistantMessageId!,
        role: 'assistant',
        content: assistantContent,
        toolCalls: [newToolCall],
        createdAt: new Date().toISOString(),
      },
    ];
  });
  break;
}

// tool_result イベント処理
case 'tool_result': {
  setMessages((prev) => {
    return prev.map((msg) => {
      if (msg.toolCalls) {
        const updatedToolCalls = msg.toolCalls.map((tc) =>
          tc.id === event.toolUseId
            ? { ...tc, status: 'completed' as const, output: event.result }
            : tc
        );
        return { ...msg, toolCalls: updatedToolCalls };
      }
      return msg;
    });
  });
  // 次のメッセージは新しいIDで作成
  assistantMessageId = null;
  assistantContent = '';
  break;
}
```

### 13.4 UI表示（ToolCallList.tsx）

```typescript
// ステータスに応じたアイコンと色
const getStatusIcon = (status: ToolCall['status']) => {
  switch (status) {
    case 'running':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

// ステータスに応じた背景色
const getStatusBg = (status: ToolCall['status']) => {
  switch (status) {
    case 'running':
      return 'bg-blue-500/10 border-blue-500/30';
    case 'completed':
      return 'bg-green-500/10 border-green-500/30';
    case 'failed':
      return 'bg-red-500/10 border-red-500/30';
    default:
      return 'bg-muted/50 border-muted';
  }
};
```

### 13.5 「常に許可」のDB永続化

#### 13.5.1 データベーススキーマ

```prisma
model Session {
  id              String    @id @default(cuid())
  title           String
  claudeSessionId String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  settings        String?   // JSON stored as string for SQLite
  allowedTools    String?   // JSON array of always-allowed tool names
  isArchived      Boolean   @default(false)
  messages        Message[]
}
```

#### 13.5.2 サーバー側実装

```typescript
// Helper to get allowed tools from session
function parseAllowedTools(allowedToolsJson: string | null): Set<string> {
  if (!allowedToolsJson) return new Set<string>();
  try {
    const tools = JSON.parse(allowedToolsJson) as string[];
    return new Set(tools);
  } catch {
    return new Set<string>();
  }
}

// Helper to save allowed tools to session
async function saveAllowedTools(sessionId: string, tools: Set<string>): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { allowedTools: JSON.stringify([...tools]) },
  });
}

// canUseTool コールバック内
const alwaysAllowedTools = parseAllowedTools(session.allowedTools);

canUseTool: async (toolName: string, input: Record<string, unknown>) => {
  // Check if tool is always allowed for this session
  if (alwaysAllowedTools.has(toolName)) {
    return { behavior: 'allow' as const, updatedInput: input };
  }

  // ... 承認リクエスト処理 ...

  if (response.decision === 'always') {
    alwaysAllowedTools.add(toolName);
    await saveAllowedTools(session.id, alwaysAllowedTools);
    return { behavior: 'allow' as const, updatedInput: input };
  }
  // ...
}
```

### 13.6 スクロール修正

ツール実行時にチャットUIがスクロールできなくなる問題の修正：

```typescript
// ChatContainer.tsx
<div className="flex flex-col h-full overflow-hidden">
  {/* ... */}
</div>

// MessageList.tsx
<ScrollArea className="flex-1 min-h-0">
  {/* ... */}
</ScrollArea>
```

- `overflow-hidden`: 親コンテナのオーバーフローを制御
- `min-h-0`: Flexbox子要素の最小高さをリセットしてスクロール可能に

### 13.7 実装ファイル一覧

| ファイル | 種別 | 状況 | 説明 |
|---------|------|------|------|
| `src/app/api/chat/route.ts` | 更新 | ✅ 実装済 | processSDKMessageを配列返却に変更、tool_resultイベント追加 |
| `src/hooks/useChat.ts` | 更新 | ✅ 実装済 | tool_use/tool_resultイベント処理、メッセージID管理 |
| `src/components/chat/ToolCallList.tsx` | 既存 | ✅ 実装済 | ステータス表示UI（running/completed/failed） |
| `src/components/chat/ChatContainer.tsx` | 更新 | ✅ 実装済 | overflow-hidden追加 |
| `src/components/chat/MessageList.tsx` | 更新 | ✅ 実装済 | min-h-0追加 |
| `prisma/schema.prisma` | 更新 | ✅ 実装済 | Session.allowedTools追加 |

### 13.8 イベントシーケンス

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client  │     │ Server  │     │   SDK   │     │  Claude │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │  POST /api/chat              │               │
     │──────────────►│               │               │
     │               │  query()      │               │
     │               │──────────────►│               │
     │               │               │  API call     │
     │               │               │──────────────►│
     │               │               │               │
     │               │               │◄──────────────│
     │               │               │  assistant    │
     │               │◄──────────────│  (tool_use)   │
     │               │               │               │
     │  SSE: tool_use (running)     │               │
     │◄──────────────│               │               │
     │               │               │               │
     │               │               │  tool exec    │
     │               │               │──────────────►│
     │               │               │               │
     │               │               │◄──────────────│
     │               │◄──────────────│  user         │
     │               │               │  (tool_result)│
     │               │               │               │
     │  SSE: tool_result (completed)│               │
     │◄──────────────│               │               │
     │               │               │               │
```

---

## 14. セッション中断機能設計

### 14.1 概要

ユーザーが停止ボタンを押した際に、フロントエンドだけでなくバックエンドのSDKクエリも適切に中断する機能。

### 14.2 問題点（修正前）

修正前の実装では以下の問題があった：

1. **UIのみ停止**: 停止ボタンを押すとfetchのAbortControllerをabortするだけで、UIは停止状態になる
2. **バックエンド継続**: SDKの`query()`は継続して実行される
3. **リソース浪費**: APIトークンが消費され続け、ツール実行も継続される
4. **状態の乖離**: UIとバックエンドの状態が一致しない

### 14.3 解決策

1. **Queryオブジェクト保持**: セッションごとにSDKのQueryオブジェクトを保持
2. **中断API**: 停止ボタン押下時にバックエンドに中断リクエストを送信
3. **SDK interrupt()**: バックエンドでSDKの`interrupt()`メソッドを呼び出し
4. **状態同期**: SDKからの完了/中断イベントでUIを更新

### 14.4 アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │   停止ボタン    │───►│ useChat Hook                        │ │
│  │   (Square)      │    │ - stopGeneration()                  │ │
│  └─────────────────┘    │   → POST /api/chat/abort            │ │
│                         │ - isGenerating (SDKイベントで更新)   │ │
│                         └──────────────┬──────────────────────┘ │
│                                         │                        │
│                                         │ POST /api/chat/abort   │
│                                         ▼                        │
├─────────────────────────────────────────────────────────────────┤
│                        Server (API Routes)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ session-manager.ts                                          │ │
│  │                                                              │ │
│  │  activeQueries: Map<sessionId, Query>                       │ │
│  │                                                              │ │
│  │  registerQuery(sessionId, query)                            │ │
│  │  unregisterQuery(sessionId)                                 │ │
│  │  interruptQuery(sessionId) → query.interrupt()              │ │
│  │  getActiveQueryCount()                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ /api/chat/route.ts                                          │ │
│  │                                                              │ │
│  │  const queryResult = query({ ... });                        │ │
│  │  registerQuery(session.id, queryResult);                    │ │
│  │                                                              │ │
│  │  try {                                                       │ │
│  │    for await (const msg of queryResult) { ... }             │ │
│  │  } finally {                                                 │ │
│  │    unregisterQuery(session.id);                             │ │
│  │  }                                                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ /api/chat/abort/route.ts                                    │ │
│  │                                                              │ │
│  │  POST: { sessionId } → interruptQuery(sessionId)            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 14.5 通信フロー

```
Client                          Server                      Claude SDK
   │                               │                              │
   │  POST /api/chat              │                              │
   │──────────────────────────────►│                              │
   │                               │  queryResult = query(...)    │
   │                               │  registerQuery(sessionId,    │
   │                               │    queryResult)              │
   │                               │─────────────────────────────►│
   │                               │                              │
   │  SSE: message/tool events    │◄─────────────────────────────│
   │◄──────────────────────────────│                              │
   │                               │                              │
   │  [User clicks Stop]          │                              │
   │                               │                              │
   │  POST /api/chat/abort        │                              │
   │  { sessionId }               │                              │
   │──────────────────────────────►│                              │
   │                               │  queryResult.interrupt()     │
   │                               │─────────────────────────────►│
   │                               │                              │
   │  200 OK                      │                              │
   │◄──────────────────────────────│                              │
   │                               │                              │
   │                               │  (query stops, returns)      │
   │                               │◄─────────────────────────────│
   │                               │                              │
   │  SSE: [DONE] or result       │                              │
   │◄──────────────────────────────│                              │
   │                               │                              │
   │  [UI updates isGenerating    │                              │
   │   based on SSE events]       │                              │
   │                               │                              │
```

### 14.6 型定義

```typescript
// types/index.ts に追加
export interface AbortRequest {
  sessionId: string;
}

export interface AbortResponse {
  success: boolean;
  message?: string;
}
```

### 14.7 サーバー側実装

#### 14.7.1 session-manager.ts

```typescript
// src/lib/claude/session-manager.ts
import type { Query } from '@anthropic-ai/claude-agent-sdk';

class SessionManager {
  private activeQueries = new Map<string, Query>();

  /**
   * Queryオブジェクトを登録
   */
  registerQuery(sessionId: string, query: Query): void {
    // 既存のクエリがあれば先に中断
    if (this.activeQueries.has(sessionId)) {
      console.warn(`Session ${sessionId} already has an active query, will be replaced`);
    }
    this.activeQueries.set(sessionId, query);
  }

  /**
   * Queryオブジェクトを登録解除
   */
  unregisterQuery(sessionId: string): void {
    this.activeQueries.delete(sessionId);
  }

  /**
   * クエリを中断
   */
  async interruptQuery(sessionId: string): Promise<boolean> {
    const query = this.activeQueries.get(sessionId);
    if (!query) {
      return false;
    }

    try {
      await query.interrupt();
      return true;
    } catch (error) {
      console.error(`Failed to interrupt query for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * セッションにアクティブなクエリがあるか確認
   */
  hasActiveQuery(sessionId: string): boolean {
    return this.activeQueries.has(sessionId);
  }

  /**
   * アクティブなクエリ数を取得
   */
  getActiveQueryCount(): number {
    return this.activeQueries.size;
  }

  /**
   * 全てのアクティブなセッションIDを取得
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.activeQueries.keys());
  }
}

export const sessionManager = new SessionManager();
```

#### 14.7.2 /api/chat/abort/route.ts

```typescript
// src/app/api/chat/abort/route.ts
import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/claude/session-manager';
import type { AbortRequest, AbortResponse } from '@/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AbortRequest;
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json<AbortResponse>(
        { success: false, message: 'sessionId is required' },
        { status: 400 }
      );
    }

    const success = await sessionManager.interruptQuery(sessionId);

    if (!success) {
      return NextResponse.json<AbortResponse>(
        { success: false, message: 'No active query found for this session' },
        { status: 404 }
      );
    }

    return NextResponse.json<AbortResponse>({ success: true });
  } catch (error) {
    console.error('Abort error:', error);
    return NextResponse.json<AbortResponse>(
      { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

#### 14.7.3 /api/chat/route.ts の更新

```typescript
// src/app/api/chat/route.ts
import { sessionManager } from '@/lib/claude/session-manager';

// ... 既存のコード ...

// SSEストリーム内で
const stream = new ReadableStream({
  async start(controller) {
    // ... 既存のセットアップ ...

    // Queryオブジェクトを作成して登録
    const queryResult = query(queryOptions);
    sessionManager.registerQuery(session.id, queryResult);

    try {
      for await (const msg of queryResult) {
        // ... 既存のメッセージ処理 ...
      }
    } catch (error) {
      // エラー処理
    } finally {
      // 必ず登録解除
      sessionManager.unregisterQuery(session.id);
      controller.close();
    }
  }
});
```

### 14.8 クライアント側実装

#### 14.8.1 useChat.ts の更新

```typescript
// src/hooks/useChat.ts

const stopGeneration = useCallback(async () => {
  if (!session?.id) {
    // セッションがない場合はfetchのAbortControllerをabort
    abortControllerRef.current?.abort();
    return;
  }

  try {
    // バックエンドにSDKクエリの中断をリクエスト
    const response = await fetch('/api/chat/abort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    });

    if (!response.ok) {
      // 中断失敗時はフォールバックとしてfetch接続をabort
      console.error('Failed to abort:', await response.text());
      abortControllerRef.current?.abort();
    }
    // 成功時: SDKのinterrupt()がクエリを停止し、ストリームが正常に終了する
    // isGeneratingはSSEストリームが閉じた時点で自動的に更新される
  } catch (err) {
    // ネットワークエラー時はフォールバックとしてfetch接続をabort
    console.error('Failed to abort:', err);
    abortControllerRef.current?.abort();
  }
}, [session?.id]);
```

### 14.9 実装ファイル一覧

| ファイル | 種別 | 説明 |
|---------|------|------|
| `src/lib/claude/session-manager.ts` | 新規 | Queryオブジェクト管理 |
| `src/app/api/chat/abort/route.ts` | 新規 | 中断APIエンドポイント |
| `src/app/api/chat/route.ts` | 更新 | Query登録/解除の追加 |
| `src/hooks/useChat.ts` | 更新 | stopGenerationの修正 |
| `src/types/index.ts` | 更新 | AbortRequest/Response型追加 |

### 14.10 注意事項

1. **状態の一貫性**: UIの`isGenerating`状態は、SDKからのイベント（`done`、`error`等）で更新される。停止ボタン押下時に手動で`false`に設定しない。

2. **タイムアウト**: `interrupt()`は即座に完了しない場合がある。クライアント側でタイムアウト処理を実装することを検討。

3. **エラーハンドリング**: 中断失敗時のUIフィードバック（トースト通知等）を実装することを推奨。

4. **重複リクエスト**: 同一セッションで複数のクエリが開始された場合、古いクエリは新しいクエリで置き換えられる。

5. **フォールバック処理**: SDK中断API（`/api/chat/abort`）が失敗した場合や、セッションIDがない状態での停止要求時は、fetchのAbortControllerをabortすることでフォールバックする。これによりネットワーク接続を切断し、クライアント側でストリーミングを停止できる。

---

## 15. ターミナル機能設計

### 15.1 概要

チャットセッションに紐付いたターミナル機能。ワークスペースディレクトリで直接コマンドを実行できる。

**主な特徴:**
- チャットセッションごとに独立したPTYセッション
- WebSocket切断時もPTYは維持（再接続可能）
- 出力バッファにより再接続時に履歴を復元
- ワークスペースパスの検証によるセキュリティ保護

### 15.2 アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Terminal.tsx                                                │ │
│  │  - xterm.js でターミナルUI表示                                │ │
│  │  - WebSocketでサーバーと通信                                  │ │
│  │  - FitAddon でリサイズ対応                                    │ │
│  │  - WebLinksAddon でリンククリック対応                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │ WebSocket                          │
│                              ▼                                    │
├─────────────────────────────────────────────────────────────────┤
│                        Server (Next.js)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  server.ts (カスタムサーバー)                                 │ │
│  │  - Next.jsサーバーにWebSocketサーバーを統合                   │ │
│  │  - /api/terminal パスへのUpgradeリクエストをハンドル          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  terminal-server/handler.ts                                  │ │
│  │  - WebSocketメッセージのルーティング                          │ │
│  │  - create/destroy/input/resize/ping メッセージ処理           │ │
│  │  - ワークスペースパス検証（パストラバーサル防止）             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  terminal-server/session-store.ts                            │ │
│  │  - PTYセッションのメモリ内管理                                │ │
│  │  - 出力バッファ管理（最大100KB）                              │ │
│  │  - アクティブWebSocket管理（再接続対応）                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  node-pty                                                     │ │
│  │  - 擬似ターミナル（PTY）の作成・管理                          │ │
│  │  - OS別シェル設定（bash/zsh/PowerShell）                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 15.3 サーバー実装

#### 15.3.1 session-store.ts

PTYセッションをメモリ内で管理するシングルトンクラス。

```typescript
// src/terminal-server/session-store.ts
import type { IPty } from 'node-pty';
import type { WebSocket } from 'ws';

const MAX_BUFFER_SIZE = 100000; // 最大100KB

interface StoredSession {
  pty: IPty;
  chatSessionId: string;
  workspacePath: string;
  outputBuffer: string[];
  bufferSize: number;
  createdAt: Date;
  activeWs: WebSocket | null;  // 現在アクティブなWebSocket
}

class SessionStore {
  private sessions = new Map<string, StoredSession>();

  create(chatSessionId: string, workspacePath: string, pty: IPty): StoredSession;
  setActiveWs(chatSessionId: string, ws: WebSocket | null): void;
  getActiveWs(chatSessionId: string): WebSocket | null;
  get(chatSessionId: string): StoredSession | undefined;
  has(chatSessionId: string): boolean;
  appendOutput(chatSessionId: string, data: string): void;
  getBuffer(chatSessionId: string): string;
  destroy(chatSessionId: string): boolean;
  destroyAll(): void;
}

export const sessionStore = new SessionStore();
```

#### 15.3.2 handler.ts

WebSocketメッセージのハンドリング。

```typescript
// src/terminal-server/handler.ts
import { WebSocketServer, WebSocket } from 'ws';
import { spawn } from 'node-pty';
import path from 'path';
import { sessionStore } from './session-store';

const WORKSPACE_BASE = process.env.WORKSPACE_BASE_PATH || './workspace';

// パストラバーサル防止
function isAllowedWorkspace(requestedPath: string): boolean {
  const basePath = path.resolve(WORKSPACE_BASE);
  const resolvedPath = path.resolve(basePath, requestedPath);
  return resolvedPath === basePath || resolvedPath.startsWith(basePath + path.sep);
}

export function setupTerminalHandler(wss: WebSocketServer): void {
  wss.on('connection', (ws, req) => {
    ws.on('message', (rawMessage) => {
      const message = JSON.parse(rawMessage.toString());
      switch (message.type) {
        case 'create': handleCreate(ws, message); break;
        case 'destroy': handleDestroy(ws, message); break;
        case 'input': handleInput(ws, message); break;
        case 'resize': handleResize(ws, message); break;
        case 'ping': ws.send(JSON.stringify({ type: 'pong' })); break;
      }
    });

    ws.on('close', () => {
      // WebSocket切断時はactiveWsをクリアするが、PTYは維持
      // → 再接続時にバッファ付きで復元可能
    });
  });
}
```

### 15.4 クライアント実装

#### 15.4.1 Terminal.tsx

xterm.jsを使用したターミナルUI。

```typescript
// src/components/terminal/Terminal.tsx
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

interface TerminalProps {
  chatSessionId: string;
  workspacePath: string;
  onReady?: () => void;
  onError?: (error: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

// 機能:
// - WebSocket接続管理（自動再接続）
// - ターミナル初期化（Catppuccinテーマ）
// - ユーザー入力のサーバー送信
// - サーバー出力の表示
// - リサイズイベントの通知
// - ハートビート（30秒間隔）
```

#### 15.4.2 TerminalPanel.tsx

ターミナルパネルのコンテナ。

```typescript
// src/components/terminal/TerminalPanel.tsx
interface TerminalPanelProps {
  chatSessionId: string;
  workspacePath: string;
  isOpen: boolean;
  onClose: () => void;
}

// 機能:
// - 高さ調整（ドラッグでリサイズ、150-600px）
// - 最大化/復元
// - 接続状態表示
// - 閉じるボタン
// - 高さ設定のlocalStorage永続化
```

### 15.5 シェル設定

OS別に適切なシェルとプロンプトを設定。

| OS | シェル | プロンプト形式 |
|----|--------|---------------|
| Windows | PowerShell | デフォルト |
| Linux/macOS (bash) | bash | `workspace/path $` (青色) |
| Linux/macOS (zsh) | zsh | `workspace/path $` (青色) |

**カスタムプロンプトの特徴:**
- ワークスペースベースからの相対パスを表示
- rcファイルによる上書きを防止（`--norc`/`--no-rcs`オプション）
- ANSIエスケープシーケンスで色付け

### 15.6 セキュリティ

1. **パストラバーサル防止**: ワークスペースパスを`WORKSPACE_BASE_PATH`配下に制限
2. **入力バリデーション**: WebSocketメッセージの型チェック
3. **セッション分離**: チャットセッションごとに独立したPTY

### 15.7 実装ファイル一覧

| ファイル | 種別 | 説明 |
|---------|------|------|
| `server.ts` | 新規 | カスタムサーバー（Next.js + WebSocket統合） |
| `src/terminal-server/handler.ts` | 新規 | WebSocketメッセージハンドラー |
| `src/terminal-server/session-store.ts` | 新規 | PTYセッション管理 |
| `src/components/terminal/Terminal.tsx` | 新規 | ターミナルUIコンポーネント |
| `src/components/terminal/TerminalPanel.tsx` | 新規 | ターミナルパネルUI |
| `src/types/terminal.ts` | 新規 | WebSocketメッセージ型定義 |
| `package.json` | 更新 | xterm.js, node-pty, ws 依存追加 |

### 15.8 依存パッケージ

```json
{
  "dependencies": {
    "@xterm/xterm": "^5.x",
    "@xterm/addon-fit": "^0.10.x",
    "@xterm/addon-web-links": "^0.11.x",
    "node-pty": "^1.x",
    "ws": "^8.x"
  },
  "devDependencies": {
    "@types/ws": "^8.x"
  }
}
```
