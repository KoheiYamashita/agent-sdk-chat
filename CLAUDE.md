# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Claude Code Web UIは、Claude Code CLIの機能をブラウザベースで提供するNext.js 15アプリケーションです。ChatGPTライクなインターフェースでClaudeと対話でき、ファイル管理、ターミナルアクセス、カスタムモデル、ツール実行承認ワークフローなどの機能を備えています。

## よく使うコマンド

```bash
# 開発
npm run dev              # 開発サーバー起動（ホットリロード）
npm run build            # 本番ビルド（prisma generate + next build）
npm run start            # 本番サーバー起動

# コード品質
npm run lint             # ESLint実行
npm run typecheck        # TypeScript型チェック

# データベース
npm run db:migrate       # Prismaマイグレーション（開発環境）
npm run db:deploy        # Prismaマイグレーション（本番環境）
npm run db:generate      # Prismaクライアント生成（スキーマ変更後に実行）
npm run db:studio        # Prisma Studio起動
```

## アーキテクチャ

### 技術スタック
- **フロントエンド**: React 19, Next.js 15 (App Router), Tailwind CSS 4, shadcn/ui
- **状態管理**: TanStack Query（サーバー状態）, React Context（UI状態）
- **バックエンド**: Next.js API Routes + Claude Agent SDK
- **データベース**: SQLite + Prisma ORM（出力先: `src/generated/prisma`）
- **ターミナル**: xterm.js（フロント）+ node-pty（バック）via WebSocket

### 主要なデータフロー

**チャットストリーミング**:
1. ユーザーが`useChat()`フック経由でメッセージ送信
2. `POST /api/chat`がSSE（Server-Sent Events）でレスポンスをストリーミング
3. イベント種別: `text_delta`, `thinking_delta`, `tool_call`, `tool_result`
4. ツール実行は`canUseTool`コールバックと`ApprovalManager`でユーザー承認が必要

**セッション管理**:
- セッションはClaude SDKの`claudeSessionId`を保持し会話を継続
- 各セッションは`settings`JSONフィールドに`workspacePath`を持つ
- メッセージはカーソルベースのページネーションで取得

### 主要モジュールの場所

| モジュール | 場所 | 役割 |
|-----------|------|------|
| チャットフック | `src/hooks/useChat.ts` | メッセージストリーミング、ツール承認、ページネーション |
| 承認マネージャー | `src/lib/approval-manager.ts` | Promiseベースのツール承認キュー |
| Claude SDK連携 | `src/lib/claude/` | SDK初期化、セッション管理 |
| ターミナルサーバー | `src/terminal-server/` | WebSocket PTYハンドラー |
| カスタムサーバー | `server.ts` | Next.js + WebSocket統合 |

### API構成

- **チャット**: `POST /api/chat`（SSE）, `/api/chat/approve`, `/api/chat/abort`
- **セッション**: `/api/sessions/[id]`でCRUD, `/api/sessions/[id]/messages`でメッセージ取得
- **モデル**: `/api/models`（標準）, `/api/models/custom`（カスタムモデル）
- **ワークスペース**: `/api/workspace/*`（一覧、クローン、ファイル操作）
- **ターミナル**: WebSocket `ws://localhost:3000/api/terminal`

### データベースモデル（Prisma）

- **Session**: `claudeSessionId`, `settings`（JSON）, `allowedTools`（JSON）
- **Message**: `role`, `content`, `toolCalls`（JSON）, トークン使用量, `thinkingContent`
- **CustomModel**: `baseModel`, `systemPrompt`, アイコンカスタマイズ
- **MCPServer**: MCPサーバー設定（stdio/sse/httpタイプ）
- **Settings**: アプリ設定のKey-Valueストア

## 開発時の注意事項

- SQLiteのJSONフィールドは文字列として保存され、アプリ層でパースされる
- クライアントコンポーネントは`"use client"`ディレクティブが必要
- UIコンポーネント追加: `npx shadcn@latest add <component>`
- 設計書は`docs/overview-design.md`と`docs/detailed-design.md`を参照
- 各ディレクトリに詳細な`CLAUDE.md`があるので参照すること
