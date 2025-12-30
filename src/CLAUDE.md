# src/

Agent SDK Chatアプリケーションのメインソースコードディレクトリです。

## ディレクトリ構成

| ディレクトリ | 役割 |
|-------------|------|
| `app/` | Next.js App Routerのページ・APIルート |
| `components/` | Reactコンポーネント（chat, sidebar, settings, terminal, workspace, ui） |
| `contexts/` | React Contextプロバイダー（SidebarContext, TerminalContext） |
| `hooks/` | カスタムReact Hooks（useChat, useSessions, useSettings, useModels） |
| `i18n/` | 国際化設定（ロケール設定、I18nProvider） |
| `lib/` | ユーティリティ、Claude SDK連携、Prismaクライアント、プロバイダー |
| `types/` | TypeScript型定義 |
| `terminal-server/` | WebSocket PTYサーバーハンドラー |
| `generated/` | Prismaクライアント出力（自動生成） |

## 主要エントリーポイント

- `app/layout.tsx` - ルートレイアウト（プロバイダー設定）
- `app/page.tsx` - ルートページ（チャットへリダイレクト）
- `lib/providers.tsx` - Reactプロバイダーの統合
- `lib/db/prisma.ts` - Prismaクライアントインスタンス

## アーキテクチャメモ

- コンポーネントは必要に応じて`"use client"`ディレクティブを使用
- TanStack Queryがhooks内でサーバー状態を管理
- Context APIがUI状態を管理（サイドバー、ターミナル）
- すべてのAPIルートは`app/api/`にRoute Handlersとして配置
