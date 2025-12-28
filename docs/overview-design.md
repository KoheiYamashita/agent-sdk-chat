# Claude Code Web UI - 概要設計書

## 1. プロジェクト概要

### 1.1 目的
Claude Code CLIの機能をWeb UIとして提供し、ブラウザから簡単にAIアシスタント機能を利用できるようにする。

### 1.2 主要機能
- **チャットインターフェース**: ChatGPT風のUIでClaude Codeと対話
- **チャット履歴管理**: 会話履歴の保存・検索・再開
- **設定管理**: MCP、Skills、Subagent、ツールのGUI設定
- **カスタムモデル**: システムプロンプトを設定したカスタムモデルの作成・管理
- **サンドボックス実行**: 安全な環境でのコード実行
- **Docker対応**: コンテナ化されたデプロイメント

### 1.3 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui |
| バックエンド | Next.js API Routes, Claude Agent SDK |
| データベース | SQLite + Prisma ORM |
| 認証 | Claude Code CLI サブスクリプション |
| コンテナ | Docker, Docker Compose |

---

## 2. システムアーキテクチャ

### 2.1 全体構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Container                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Next.js Application                    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  ┌─────────────────┐    ┌─────────────────────────────┐ │   │
│  │  │   Frontend      │    │      API Routes             │ │   │
│  │  │   (React)       │◄──►│   /api/chat                 │ │   │
│  │  │                 │    │   /api/sessions             │ │   │
│  │  │  - Chat UI      │    │   /api/settings             │ │   │
│  │  │  - Settings     │    │   /api/mcp                  │ │   │
│  │  │  - History      │    │   /api/tools                │ │   │
│  │  └─────────────────┘    └──────────────┬──────────────┘ │   │
│  │                                         │                 │   │
│  │                         ┌───────────────▼───────────────┐ │   │
│  │                         │   Claude Agent SDK            │ │   │
│  │                         │   @anthropic-ai/claude-agent  │ │   │
│  │                         │   -sdk v0.1.76                │ │   │
│  │                         └───────────────┬───────────────┘ │   │
│  │                                         │                 │   │
│  │  ┌─────────────────┐    ┌───────────────▼───────────────┐ │   │
│  │  │   SQLite DB     │◄──►│   Claude Code CLI            │ │   │
│  │  │   (Prisma)      │    │   (Runtime)                   │ │   │
│  │  └─────────────────┘    └───────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Volume Mounts:                                                  │
│  - ~/.claude (認証情報)                                          │
│  - ./data (SQLiteデータベース)                                   │
│  - ./workspace (作業ディレクトリ)                                │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 コンポーネント構成

```
src/
├── app/                          # Next.js App Router
│   ├── chat/                     # チャット関連ページ
│   │   ├── layout.tsx            # チャットレイアウト（サイドバー付き）
│   │   ├── page.tsx              # 新規チャットページ
│   │   └── [sessionId]/          # セッション別ページ
│   │       └── page.tsx
│   ├── settings/                 # 設定ページ
│   │   ├── layout.tsx            # 設定レイアウト
│   │   ├── page.tsx              # 設定メイン（権限モード、デフォルトツール、外観設定等）
│   │   └── models/
│   │       └── page.tsx          # カスタムモデル管理ページ
│   ├── usage/                    # 使用量表示ページ
│   │   ├── layout.tsx            # 使用量レイアウト
│   │   └── page.tsx              # 使用量メイン
│   ├── files/                    # ファイルブラウザページ
│   │   ├── layout.tsx            # ファイルレイアウト
│   │   └── page.tsx              # ファイルブラウザメイン
│   ├── api/                      # API Routes
│   │   ├── chat/                 # チャットAPI
│   │   │   ├── route.ts          # POST /api/chat
│   │   │   └── approve/
│   │   │       └── route.ts      # POST /api/chat/approve
│   │   ├── sessions/             # セッション管理API
│   │   │   ├── route.ts          # GET/POST /api/sessions
│   │   │   └── [id]/
│   │   │       ├── route.ts      # GET/PATCH/DELETE /api/sessions/[id]
│   │   │       └── messages/
│   │   │           └── route.ts  # GET /api/sessions/[id]/messages (差分ロード)
│   │   ├── settings/             # 設定API
│   │   │   └── route.ts          # GET/PUT /api/settings
│   │   ├── models/               # モデル管理API
│   │   │   ├── route.ts          # GET /api/models (全モデル取得)
│   │   │   ├── supported/
│   │   │   │   └── route.ts      # GET /api/models/supported (標準モデル)
│   │   │   └── custom/
│   │   │       ├── route.ts      # GET/POST /api/models/custom
│   │   │       └── [id]/
│   │   │           └── route.ts  # GET/PUT/DELETE /api/models/custom/[id]
│   │   ├── mcp/                  # MCP管理API
│   │   │   ├── route.ts          # GET/POST /api/mcp
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET/PATCH/DELETE /api/mcp/[id]
│   │   ├── agents/               # エージェント管理API
│   │   │   ├── route.ts          # GET/POST /api/agents
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET/PATCH/DELETE /api/agents/[id]
│   │   ├── workspace/            # ワークスペース管理API
│   │   │   ├── list/
│   │   │   │   └── route.ts      # GET /api/workspace/list
│   │   │   ├── create/
│   │   │   │   └── route.ts      # POST /api/workspace/create
│   │   │   ├── file/
│   │   │   │   ├── route.ts      # GET/PUT /api/workspace/file
│   │   │   │   ├── create/
│   │   │   │   │   └── route.ts  # POST /api/workspace/file/create
│   │   │   │   └── download/
│   │   │   │       └── route.ts  # GET /api/workspace/file/download
│   │   │   ├── delete/
│   │   │   │   └── route.ts      # DELETE /api/workspace/delete
│   │   │   ├── rename/
│   │   │   │   └── route.ts      # POST /api/workspace/rename
│   │   │   └── upload/
│   │   │       └── route.ts      # POST /api/workspace/upload
│   │   ├── usage/                # 使用量API
│   │   │   └── route.ts          # GET /api/usage
│   │   └── health/               # ヘルスチェックAPI
│   │       └── route.ts          # GET /api/health
│   ├── page.tsx                  # ルートページ（/chatへリダイレクト）
│   ├── layout.tsx                # ルートレイアウト
│   └── globals.css               # グローバルスタイル
├── components/                   # UIコンポーネント
│   ├── ui/                       # shadcn/uiコンポーネント
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── scroll-area.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── tabs.tsx
│   │   ├── tooltip.tsx
│   │   ├── sheet.tsx
│   │   ├── skeleton.tsx
│   │   ├── toggle-group.tsx
│   │   ├── radio-group.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── checkbox.tsx
│   │   ├── separator.tsx
│   │   ├── collapsible.tsx
│   │   ├── popover.tsx
│   │   └── switch.tsx
│   ├── chat/                     # チャット関連コンポーネント
│   │   ├── ChatContainer.tsx     # チャットメインコンテナ
│   │   ├── ChatHeader.tsx        # チャットヘッダー
│   │   ├── MessageList.tsx       # メッセージリスト
│   │   ├── MessageItem.tsx       # 個別メッセージ表示
│   │   ├── InputArea.tsx         # 入力エリア
│   │   ├── PermissionModeSelector.tsx  # 権限モード選択UI
│   │   ├── ToolApprovalCard.tsx  # ツール実行確認カード
│   │   ├── ToolCallList.tsx      # ツール実行ステータス表示
│   │   ├── MarkdownRenderer.tsx  # Markdownレンダリング
│   │   └── ModelSelector.tsx     # モデル選択UI
│   ├── sidebar/                  # サイドバー関連
│   │   ├── Sidebar.tsx           # サイドバーメイン
│   │   ├── SessionList.tsx       # セッション一覧
│   │   └── SessionItem.tsx       # セッションアイテム
│   ├── settings/                 # 設定関連
│   │   ├── PermissionModeRadioGroup.tsx  # 権限モード設定
│   │   ├── DefaultToolsCheckboxGroup.tsx # デフォルトツール選択
│   │   ├── AppearanceSettingsForm.tsx    # 外観設定（アイコンカスタマイズ等）
│   │   ├── CustomModelCard.tsx           # カスタムモデルカード
│   │   ├── CustomModelForm.tsx           # カスタムモデル作成・編集フォーム
│   │   └── IconPicker.tsx                # アイコン選択UI
│   ├── terminal/                 # ターミナル関連
│   │   ├── Terminal.tsx          # ターミナルコンポーネント（xterm.js）
│   │   └── TerminalPanel.tsx     # ターミナルパネルUI
│   └── workspace/                # ワークスペース関連
│       ├── index.ts              # エクスポート
│       ├── WorkspaceBadge.tsx    # ワークスペースバッジ表示
│       ├── WorkspaceSelector.tsx # ワークスペース選択UI
│       ├── WorkspaceTree.tsx     # ディレクトリツリー
│       ├── WorkspaceTreeItem.tsx # ツリーアイテム
│       ├── FileBrowserTree.tsx   # ファイルブラウザツリー
│       ├── FileBrowserItem.tsx   # ファイルブラウザ項目
│       └── FilePreview.tsx       # ファイルプレビュー・編集
├── contexts/                     # React Context
│   └── SidebarContext.tsx        # サイドバー状態管理
├── lib/                          # ユーティリティ
│   ├── claude/                   # Claude SDK関連
│   │   ├── client.ts             # SDKクライアント
│   │   └── types.ts              # 型定義
│   ├── constants/                # 定数
│   │   └── tools.ts              # ビルトインツール定義
│   ├── db/                       # データベース
│   │   └── prisma.ts             # Prismaクライアント
│   ├── utils/                    # ユーティリティ関数
│   │   └── uuid.ts               # UUID生成
│   ├── utils.ts                  # 共通ユーティリティ（cn等）
│   ├── providers.tsx             # React Query Provider
│   └── approval-manager.ts       # ツール承認マネージャー
├── hooks/                        # カスタムフック
│   ├── useChat.ts                # チャット管理
│   ├── useSessions.ts            # セッション管理
│   ├── useSettings.ts            # 設定管理
│   ├── useUsage.ts               # 使用量取得
│   └── useModels.ts              # モデル管理（標準・カスタム）
├── types/                        # 型定義
│   ├── index.ts                  # 共通型定義
│   ├── chat.ts                   # チャット関連型
│   ├── session.ts                # セッション関連型
│   ├── settings.ts               # 設定関連型
│   ├── workspace.ts              # ワークスペース関連型
│   ├── usage.ts                  # 使用量関連型
│   ├── terminal.ts               # ターミナル関連型
│   └── models.ts                 # モデル関連型（StandardModel, CustomModel, SelectableModel）
├── terminal-server/              # ターミナルサーバー（Next.js統合）
│   ├── handler.ts                # WebSocketハンドラー
│   └── session-store.ts          # PTYセッション管理
└── generated/                    # 自動生成ファイル
    └── prisma/                   # Prisma生成コード
```

---

## 3. データモデル

### 3.1 ER図

```
┌─────────────────────┐     ┌─────────────────────┐
│      Session        │     │      Message        │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │────<│ id (PK)             │
│ title               │     │ sessionId (FK)      │
│ claudeSessionId     │     │ role                │
│ createdAt           │     │ content             │
│ updatedAt           │     │ toolCalls           │
│ settings            │     │ inputTokens         │
│ allowedTools        │     │ outputTokens        │
│ isArchived          │     │ model               │
└─────────────────────┘     │ modelDisplayName    │
                            │ thinkingContent     │
                            │ createdAt           │
                            └─────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│    MCPServer        │     │      Agent          │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │     │ id (PK)             │
│ name                │     │ name                │
│ type                │     │ description         │
│ command             │     │ prompt              │
│ args                │     │ tools               │
│ env                 │     │ model               │
│ isEnabled           │     │ isEnabled           │
│ createdAt           │     │ createdAt           │
└─────────────────────┘     └─────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│     Settings        │     │    CustomModel      │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │     │ id (PK)             │
│ key                 │     │ name (UNIQUE)       │
│ value               │     │ displayName         │
│ updatedAt           │     │ baseModel           │
└─────────────────────┘     │ systemPrompt        │
                            │ description         │
                            │ icon                │
                            │ iconColor           │
                            │ iconImageUrl        │
                            │ isEnabled           │
                            │ sortOrder           │
                            │ createdAt           │
                            │ updatedAt           │
                            └─────────────────────┘
```

### 3.2 Prismaスキーマ

```prisma
// SQLiteを使用するため、JSON型はString型で格納し、アプリケーション側でパース

model Session {
  id              String    @id @default(cuid())
  title           String
  claudeSessionId String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  settings        String?   // JSON stored as string for SQLite
  allowedTools    String?   // JSON array of always-allowed tool names (per session)
  isArchived      Boolean   @default(false)
  messages        Message[]
}

model Message {
  id        String   @id @default(cuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      String   // 'user' | 'assistant' | 'system'
  content   String
  toolCalls String?  // JSON stored as string for SQLite

  // Usage & metadata columns
  inputTokens              Int?
  outputTokens             Int?
  cacheCreationInputTokens Int?
  cacheReadInputTokens     Int?
  cost                     Float?
  model                    String?
  modelDisplayName         String?  // Custom model display name (if custom model was used)
  durationMs               Int?
  thinkingContent          String?

  createdAt DateTime @default(now())

  @@index([sessionId])
}

model MCPServer {
  id        String   @id @default(cuid())
  name      String   @unique
  type      String   // 'stdio' | 'sse' | 'http'
  command   String?
  args      String?  // JSON stored as string for SQLite
  env       String?  // JSON stored as string for SQLite
  url       String?
  headers   String?  // JSON stored as string for SQLite
  isEnabled Boolean  @default(true)
  createdAt DateTime @default(now())
}

model Agent {
  id          String   @id @default(cuid())
  name        String   @unique
  description String
  prompt      String
  tools       String?  // JSON stored as string for SQLite
  model       String?
  isEnabled   Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model Settings {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String   // JSON stored as string for SQLite
  updatedAt DateTime @updatedAt
}

model CustomModel {
  id           String   @id @default(cuid())
  name         String   @unique
  displayName  String
  baseModel    String   // Standard model ID from SDK (e.g. 'claude-sonnet-4-20250514')
  systemPrompt String?
  description  String?
  icon         String?  // Lucide icon name or emoji
  iconColor    String?
  iconImageUrl String?  // Custom image URL for icon
  isEnabled    Boolean  @default(true)
  sortOrder    Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## 4. 主要機能フロー

### 4.1 チャット送信フロー

```
User Input → API Route → Claude Agent SDK → Claude Code CLI → Response Stream
     ↓                                                              ↓
   UI Update ← WebSocket/SSE ← Message Processing ← SDK Messages ←─┘
     ↓
   DB Save (Message)
```

### 4.2 セッション管理フロー

```
新規セッション作成:
1. User clicks "New Chat"
2. Frontend creates new session in DB
3. Claude Agent SDK query starts fresh
4. session_id from SDK stored in Session.claudeSessionId

セッション再開:
1. User selects existing session
2. Load messages from DB for display
3. Use SDK's resume option with claudeSessionId
4. Continue conversation with full context
```

### 4.3 MCP設定フロー

```
MCP Server追加:
1. User fills MCP form (name, type, command/url, args, env)
2. Save to MCPServer table
3. Next chat will include new MCP in mcpServers option
4. SDK connects to MCP server on query start
```

---

## 5. セキュリティ考慮事項

### 5.1 認証
- Claude Code CLI のサブスクリプション認証を利用
- `~/.claude` ディレクトリをDockerにマウントして認証情報を共有
- 初回起動時に認証フローを案内

### 5.2 サンドボックス
- Claude Agent SDKの`sandbox`オプションを使用
- ファイルシステムアクセスは指定ディレクトリに制限
- ネットワークアクセスは設定で制御可能

### 5.3 入力検証
- すべてのAPI入力をZodでバリデーション
- SQLインジェクション防止（Prisma ORM使用）
- XSS防止（React自動エスケープ + DOMPurify）

---

## 6. Docker構成

### 6.1 Dockerfile概要

```dockerfile
FROM node:20-alpine AS base

# Claude Code CLI インストール
RUN npm install -g @anthropic-ai/claude-code

# アプリケーションビルド
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# プロダクション
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### 6.2 ボリュームマウント

| ホストパス | コンテナパス | 用途 |
|-----------|-------------|------|
| `~/.claude` | `/root/.claude` | Claude認証情報 |
| `./data` | `/app/data` | SQLiteデータベース |
| `./workspace` | `/app/workspace` | 作業ディレクトリ |

---

## 7. 実装状況

### 7.1 実装済み機能 ✅

#### インフラ・基盤
| 機能 | ファイル | 備考 |
|------|---------|------|
| Next.js 15 プロジェクト構成 | `package.json`, `next.config.ts` | App Router, Turbopack対応 |
| Prisma + SQLite | `prisma/schema.prisma`, `src/lib/db/prisma.ts` | prisma-client生成 |
| 型定義 | `src/types/*.ts` | Session, Message, ChatEvent, Settings等 |
| shadcn/ui コンポーネント | `src/components/ui/*` | Button, Input, Card, Tabs, DropdownMenu等 |
| Docker対応 | `Dockerfile`, `docker-compose.yml` | ~/.claude マウント対応 |
| ヘルスチェック | `src/app/api/health/route.ts` | GET /api/health |

#### チャット機能
| 機能 | ファイル | 備考 |
|------|---------|------|
| チャットUI | `src/components/chat/*` | ChatGPT風デザイン |
| メッセージ送受信 | `src/app/api/chat/route.ts` | SSEストリーミング対応 |
| チャット履歴表示 | `src/hooks/useChat.ts` | React Query使用 |
| ストリーミングレスポンス | `src/app/api/chat/route.ts` | Server-Sent Events |
| 生成中断機能 | `src/hooks/useChat.ts`, `src/lib/claude/session-manager.ts` | SDK interrupt()使用 |
| Markdownレンダリング | `src/components/chat/MarkdownRenderer.tsx` | react-markdown, rehype-highlight使用 |
| ストリーミングテキスト表示 | `src/components/chat/MessageItem.tsx` | リアルタイム文字表示 |
| 拡張思考（Thinking）表示 | `src/components/chat/MessageItem.tsx`, `src/components/ui/collapsible.tsx` | thinking_deltaストリーミング、折りたたみ表示 |
| Thinkingトグル | `src/components/chat/PermissionModeSelector.tsx`, `src/app/settings/page.tsx` | 入力欄・設定画面でThinking有効化切替 |

#### セッション管理
| 機能 | ファイル | 備考 |
|------|---------|------|
| セッション一覧表示 | `src/components/sidebar/Sidebar.tsx` | サイドバーに表示 |
| セッション作成 | `src/app/api/sessions/route.ts` | 新規チャット開始時に自動作成 |
| セッション詳細取得 | `src/app/api/sessions/[id]/route.ts` | メッセージ含む |
| セッション更新 | `src/app/api/sessions/[id]/route.ts` | PATCH対応（タイトル、設定、アーカイブ） |
| セッション削除 | `src/app/api/sessions/[id]/route.ts` | CASCADE削除 |
| セッション切替 | `src/hooks/useSessions.ts` | staleTime:0で常に最新取得 |
| メッセージ差分ロード | `src/app/api/sessions/[id]/messages/route.ts` | カーソルベースページネーション |
| サイドバー横幅調整 | `src/contexts/SidebarContext.tsx` | ドラッグ可能 |
| 新規チャットリセット | `src/contexts/SidebarContext.tsx` | `/chat`ページで新規チャットボタン押下時に状態リセット |
| セッション削除確認 | `src/components/sidebar/SessionItem.tsx` | AlertDialogによる確認、削除後リダイレクト |

#### ナビゲーションパターン
ブラウザ履歴スタックを適切に管理するため、以下のナビゲーションパターンを採用：

| 操作 | 現在地 | 遷移先 | 方法 | 説明 |
|------|--------|--------|------|------|
| セッションクリック | `/chat` | `/chat/:id` | **push** | 履歴に追加（戻れるように） |
| セッションクリック | `/chat/:id` | `/chat/:id2` | **replace** | 履歴を置換（スタック蓄積防止） |
| 新規チャット | `/chat/:id` | `/chat` | **back()** | 履歴を戻る（スタック蓄積防止） |
| 新規チャット | `/chat` | - | resetChat() | 遷移せず状態リセット |
| 設定/使用量へ | `/chat` | `/settings` | **push** (Link) | 履歴に追加 |
| 戻るボタン | `/settings` | `/chat` | **push** (Link) | 履歴に追加 |

#### Claude Agent SDK統合
| 機能 | ファイル | 備考 |
|------|---------|------|
| SDK接続 | `src/app/api/chat/route.ts` | @anthropic-ai/claude-agent-sdk |
| セッション再開 | `src/app/api/chat/route.ts` | claudeSessionId使用 |
| メッセージ処理 | `src/app/api/chat/route.ts` | テキストコンテンツ抽出 |
| ツール実行確認 | `src/app/api/chat/route.ts` | canUseToolコールバック |
| ツール結果イベント | `src/app/api/chat/route.ts` | tool_result SSEイベント |

#### ツール実行機能
| 機能 | ファイル | 備考 |
|------|---------|------|
| ツール実行確認UI | `src/components/chat/ToolApprovalCard.tsx` | インライン表示、キーボードショートカット |
| ツール実行ステータス表示 | `src/components/chat/ToolCallList.tsx` | running/completed/failed表示 |
| 「常に許可」永続化 | `src/app/api/chat/route.ts` | Session.allowedToolsに保存 |
| 承認マネージャー | `src/lib/approval-manager.ts` | Promise待機管理 |
| 承認API | `src/app/api/chat/approve/route.ts` | POST /api/chat/approve |

#### 設定機能
| 機能 | ファイル | 備考 |
|------|---------|------|
| 権限モード切替UI | `src/components/chat/PermissionModeSelector.tsx` | チャット入力欄上部で即時切替 |
| 設定画面 | `src/app/settings/page.tsx` | デフォルト権限モード、デフォルトツール設定 |
| 設定API | `src/app/api/settings/route.ts` | GET/PUT対応 |
| 設定フック | `src/hooks/useSettings.ts` | React Query使用 |
| デフォルトツール選択UI | `src/components/settings/DefaultToolsCheckboxGroup.tsx` | カテゴリ別チェックボックス |
| ビルトインツール定義 | `src/lib/constants/tools.ts` | ツール名、説明、危険度 |

#### 外観設定機能
| 機能 | ファイル | 備考 |
|------|---------|------|
| 外観設定UI | `src/components/settings/AppearanceSettingsForm.tsx` | ユーザー/Claudeアイコンのカスタマイズ |
| アイコン種類選択 | `src/components/settings/AppearanceSettingsForm.tsx` | デフォルト、イニシャル、カスタム画像 |
| ユーザー表示名設定 | `src/app/settings/page.tsx` | チャット画面で表示される名前 |
| ユーザー名・モデル名表示 | `src/components/chat/MessageItem.tsx` | メッセージにユーザー名・モデル名を表示 |

#### ワークスペース機能
| 機能 | ファイル | 備考 |
|------|---------|------|
| ワークスペース一覧API | `src/app/api/workspace/list/route.ts` | ディレクトリ一覧取得、ファイル含む |
| ワークスペース作成API | `src/app/api/workspace/create/route.ts` | ディレクトリ作成 |
| ワークスペースバッジ | `src/components/workspace/WorkspaceBadge.tsx` | ChatHeaderに表示 |
| ワークスペース選択UI | `src/components/workspace/WorkspaceSelector.tsx` | セッションごとにワークスペース設定 |
| ディレクトリツリー | `src/components/workspace/WorkspaceTree.tsx` | フォルダ構造表示 |
| セキュリティチェック | `src/app/api/workspace/list/route.ts` | ベースワークスペース外へのアクセス防止 |

#### ファイルブラウザ機能
| 機能 | ファイル | 備考 |
|------|---------|------|
| ファイルブラウザページ | `src/app/files/page.tsx` | ファイル一覧・プレビュー・編集 |
| ファイルブラウザツリー | `src/components/workspace/FileBrowserTree.tsx` | ファイル・フォルダ一覧表示 |
| ファイルブラウザ項目 | `src/components/workspace/FileBrowserItem.tsx` | 展開・アクション対応・パスコピー |
| ファイルプレビュー | `src/components/workspace/FilePreview.tsx` | テキスト編集・画像プレビュー |
| ファイル読み書きAPI | `src/app/api/workspace/file/route.ts` | バイナリ/テキスト対応 |
| ファイル作成API | `src/app/api/workspace/file/create/route.ts` | ファイル・フォルダ作成 |
| ファイルダウンロードAPI | `src/app/api/workspace/file/download/route.ts` | バイナリダウンロード |
| 削除API | `src/app/api/workspace/delete/route.ts` | ファイル・フォルダ削除 |
| 名前変更API | `src/app/api/workspace/rename/route.ts` | ファイル・フォルダ名変更 |
| アップロードAPI | `src/app/api/workspace/upload/route.ts` | 複数ファイルアップロード |

#### 使用量表示機能
| 機能 | ファイル | 備考 |
|------|---------|------|
| 使用量API | `src/app/api/usage/route.ts` | Anthropic APIから使用量データ取得 |
| 使用量表示ページ | `src/app/usage/page.tsx` | 5時間/7日間の使用量表示 |
| 使用量フック | `src/hooks/useUsage.ts` | 使用量データ取得 |
| サイドバー使用量ボタン | `src/components/sidebar/Sidebar.tsx` | 使用量ページへのリンク |

#### ターミナル機能
| 機能 | ファイル | 備考 |
|------|---------|------|
| ターミナルUI | `src/components/terminal/Terminal.tsx` | xterm.js使用、WebSocket通信 |
| ターミナルパネル | `src/components/terminal/TerminalPanel.tsx` | リサイズ・最大化対応、接続状態表示 |
| WebSocketハンドラー | `src/terminal-server/handler.ts` | node-pty使用、PTYセッション管理 |
| セッションストア | `src/terminal-server/session-store.ts` | PTYセッションのメモリ内管理 |
| 型定義 | `src/types/terminal.ts` | WebSocketメッセージ型定義 |
| Next.js統合 | `server.ts` | カスタムサーバーでWebSocket対応 |

**ターミナル機能の特徴:**
- チャットセッションごとに独立したPTYセッション
- 再接続時に出力バッファを復元
- ワークスペースパスの検証（パストラバーサル防止）
- OS別シェル設定（bash/zsh/PowerShell）
- カスタムプロンプト（ワークスペース相対パス表示）

#### MCP管理API
| 機能 | ファイル | 備考 |
|------|---------|------|
| MCPサーバー一覧取得 | `src/app/api/mcp/route.ts` | GET /api/mcp |
| MCPサーバー追加 | `src/app/api/mcp/route.ts` | POST /api/mcp |
| MCPサーバー詳細取得 | `src/app/api/mcp/[id]/route.ts` | GET /api/mcp/[id] |
| MCPサーバー更新 | `src/app/api/mcp/[id]/route.ts` | PATCH /api/mcp/[id] |
| MCPサーバー削除 | `src/app/api/mcp/[id]/route.ts` | DELETE /api/mcp/[id] |

#### エージェント管理API
| 機能 | ファイル | 備考 |
|------|---------|------|
| エージェント一覧取得 | `src/app/api/agents/route.ts` | GET /api/agents |
| エージェント追加 | `src/app/api/agents/route.ts` | POST /api/agents |
| エージェント詳細取得 | `src/app/api/agents/[id]/route.ts` | GET /api/agents/[id] |
| エージェント更新 | `src/app/api/agents/[id]/route.ts` | PATCH /api/agents/[id] |
| エージェント削除 | `src/app/api/agents/[id]/route.ts` | DELETE /api/agents/[id] |

#### カスタムモデル機能
| 機能 | ファイル | 備考 |
|------|---------|------|
| モデル一覧API | `src/app/api/models/route.ts` | GET /api/models（標準+カスタム） |
| 標準モデルAPI | `src/app/api/models/supported/route.ts` | GET /api/models/supported |
| カスタムモデルCRUD API | `src/app/api/models/custom/route.ts` | GET/POST /api/models/custom |
| カスタムモデル詳細API | `src/app/api/models/custom/[id]/route.ts` | GET/PUT/DELETE |
| モデル選択UI | `src/components/chat/ModelSelector.tsx` | チャット入力エリアでモデル切替 |
| カスタムモデル管理ページ | `src/app/settings/models/page.tsx` | カスタムモデル作成・編集・削除 |
| カスタムモデルカード | `src/components/settings/CustomModelCard.tsx` | モデル表示・有効/無効切替 |
| カスタムモデルフォーム | `src/components/settings/CustomModelForm.tsx` | モデル作成・編集 |
| アイコン選択UI | `src/components/settings/IconPicker.tsx` | Lucideアイコン・画像選択 |
| モデルフック | `src/hooks/useModels.ts` | TanStack Query使用 |
| 画像最適化ユーティリティ | `src/lib/image-utils.ts` | アイコン画像のリサイズ・圧縮 |

**カスタムモデル機能の特徴:**
- システムプロンプトを事前設定したモデルを作成可能
- 標準モデル（claude-sonnet-4等）をベースに拡張
- カスタムアイコン（Lucideアイコン・画像）設定
- チャット画面でモデル切替可能
- メッセージごとに使用モデル情報を記録
- デフォルトモデルを設定可能

#### その他
| 機能 | ファイル | 備考 |
|------|---------|------|
| UUID生成 | `src/lib/utils/uuid.ts` | ブラウザ互換フォールバック付き |
| React Query Provider | `src/lib/providers.tsx` | キャッシュ管理 |
| ルーティング | `src/app/chat/page.tsx`, `src/app/chat/[sessionId]/page.tsx` | App Router |

---

### 7.2 未実装機能 ❌

#### 設定UI
| 機能 | 優先度 | 備考 |
|------|--------|------|
| MCP設定UI | 高 | サーバー追加・編集・削除（APIは実装済み） |
| Subagent設定UI | 中 | カスタムエージェント定義（APIは実装済み） |
| Skills設定UI | 中 | スラッシュコマンド設定 |
| 一般設定UI | 中 | 言語設定など（外観設定・モデル設定は実装済み） |

#### セッション拡張
| 機能 | 優先度 | 備考 |
|------|--------|------|
| セッション検索 | 中 | タイトル・内容検索 |
| セッションエクスポート | 低 | JSON/Markdown出力 |
| セッションインポート | 低 | 履歴復元 |

#### UI/UX
| 機能 | 優先度 | 備考 |
|------|--------|------|
| ダークモード切替UI | 中 | テーマ切替ボタン（ダークテーマ自体は実装済み） |
| レスポンシブデザイン | 中 | モバイル対応（一部実装済み） |
| エラートースト通知 | 中 | 操作フィードバック |

#### セキュリティ・品質
| 機能 | 優先度 | 備考 |
|------|--------|------|
| 入力バリデーション | 中 | Zodスキーマ |
| 入力サニタイズ | 高 | XSS対策 |
| レート制限 | 中 | API保護 |
| エラーバウンダリ | 中 | グローバルエラー処理 |
| ユニットテスト | 低 | Vitest |
| E2Eテスト | 低 | Playwright |

---

### 7.3 開発ロードマップ

#### Phase 1: 基本機能 ✅ 完了
- [x] プロジェクトセットアップ
- [x] チャットUI実装
- [x] Claude Agent SDK統合
- [x] セッション管理
- [x] Docker対応

#### Phase 2: 設定機能 ✅ 完了
- [x] 権限モード切替UI
- [x] ツール実行確認UI
- [x] ツール実行ステータス表示
- [x] 「常に許可」のDB永続化
- [x] デフォルトツール設定UI
- [x] 設定API（GET/PUT）

#### Phase 3: API拡張 ✅ 完了
- [x] MCP管理API（GET/POST/PATCH/DELETE）
- [x] エージェント管理API（GET/POST/PATCH/DELETE）
- [x] セッションPATCH API
- [x] メッセージ差分ロードAPI

#### Phase 4: チャット拡張 ✅ 完了
- [x] Markdownレンダリング（react-markdown使用）
- [x] ツール実行結果表示
- [x] ストリーミングテキスト表示

#### Phase 5: 設定UI 🚧 進行中
- [x] 外観設定UI（アイコンカスタマイズ、ユーザー表示名）
- [x] カスタムモデル機能（作成・編集・削除、モデル選択UI）
- [x] デフォルトモデル設定
- [ ] MCP設定UI（APIは実装済み）
- [ ] Subagent設定UI（APIは実装済み）
- [ ] Skills設定UI

#### Phase 6: ワークスペース・使用量 ✅ 完了
- [x] ワークスペース選択機能
- [x] Claude Code使用量表示機能
- [x] ユーザー名・モデル名表示

#### Phase 7: ターミナル機能 ✅ 完了
- [x] ターミナルUI（xterm.js）
- [x] WebSocketサーバー（Next.js統合）
- [x] PTYセッション管理（node-pty）
- [x] 再接続・バッファ復元
- [x] パストラバーサル防止

#### Phase 8: UI/UX改善
- [ ] ダークモード切替UI
- [ ] レスポンシブデザイン強化
- [ ] セッション検索
- [ ] エラー通知改善

#### Phase 9: 品質・最適化
- [ ] テスト追加
- [ ] 入力バリデーション（Zod）
- [ ] セキュリティ強化
- [ ] パフォーマンス最適化

---

## 8. 参考資料

- [Claude Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/api/agent-sdk/typescript)
- [Claude Agent SDK Overview](https://platform.claude.com/docs/en/api/agent-sdk/overview)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
