# src/app/

Next.js App Routerのルーティングとページを管理するディレクトリです。

## ディレクトリ構成

### ページルート
- `/` (`page.tsx`) - ルートページ（チャットへリダイレクト）
- `/chat` - チャット一覧ページ
- `/chat/[sessionId]` - 個別チャットセッションページ
- `/settings` - 設定ページ
- `/usage` - 使用状況ページ

### APIルート (`api/`)
- `GET/POST /api/sessions` - セッション一覧取得・作成
- `GET/PUT/DELETE /api/sessions/[id]` - セッション詳細・更新・削除
- `GET /api/sessions/[id]/messages` - メッセージ取得
- `POST /api/chat` - チャットメッセージ送信（ストリーミング）
- `POST /api/chat/abort` - チャット中断
- `POST /api/chat/approve` - ツール実行承認
- `GET/POST /api/agents` - エージェント管理
- `GET/POST /api/mcp` - MCPサーバー管理
- `GET/PUT /api/settings` - 設定管理
- `GET /api/usage` - 使用状況取得
- `GET /api/health` - ヘルスチェック
- `/api/workspace/*` - ワークスペース管理（list, create, clone）

## 主要ファイル

- `layout.tsx` - ルートレイアウト（プロバイダー設定）
- `globals.css` - グローバルスタイル（Tailwind CSS）

## 注意事項

- APIルートはすべて Route Handlers を使用しています
- チャットAPIはServer-Sent Events（SSE）でストリーミングレスポンスを返します
- セッション管理は Prisma を使用してDBに永続化されます
