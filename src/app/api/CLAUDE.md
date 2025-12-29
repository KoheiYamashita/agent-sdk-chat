# src/app/api/

Next.js App RouterのAPIルートを格納しています。

## ディレクトリ構成

| ディレクトリ | エンドポイント | 役割 |
|-------------|---------------|------|
| `chat/` | `POST /api/chat` | チャットメッセージ送信（SSEストリーミング） |
| `chat/abort/` | `POST /api/chat/abort` | チャット中断 |
| `chat/approve/` | `POST /api/chat/approve` | ツール実行承認/拒否 |
| `sessions/` | `GET/POST /api/sessions` | セッション一覧取得・作成 |
| `sessions/[id]/` | `GET/PATCH/DELETE /api/sessions/[id]` | セッション詳細・更新・削除 |
| `sessions/[id]/messages/` | `GET /api/sessions/[id]/messages` | メッセージ取得（カーソルページネーション） |
| `models/` | `GET /api/models` | 全モデル取得（標準+カスタム） |
| `models/supported/` | `GET /api/models/supported` | 標準Claudeモデル一覧 |
| `models/custom/` | `GET/POST /api/models/custom` | カスタムモデル一覧・作成 |
| `models/custom/[id]/` | `GET/PUT/DELETE /api/models/custom/[id]` | カスタムモデル詳細・更新・削除 |
| `agents/` | `GET/POST /api/agents` | エージェント管理 |
| `agents/[id]/` | `GET/PATCH/DELETE /api/agents/[id]` | エージェント詳細 |
| `mcp/` | `GET/POST /api/mcp` | MCPサーバー管理 |
| `mcp/[id]/` | `GET/PATCH/DELETE /api/mcp/[id]` | MCPサーバー詳細 |
| `settings/` | `GET/PUT /api/settings` | アプリケーション設定 |
| `usage/` | `GET /api/usage` | トークン使用量統計 |
| `health/` | `GET /api/health` | ヘルスチェック |
| `workspace/` | 複数 | ワークスペース・ファイル操作 |
| `search/sessions/` | `GET /api/search/sessions` | セッション検索（タイトル・メッセージ内容・モデル名） |
| `search/messages/` | `GET /api/search/messages` | メッセージ検索（セッション内） |
| `tags/` | `GET/POST /api/tags` | タグ一覧取得・作成 |
| `tags/[id]/` | `PATCH/DELETE /api/tags/[id]` | タグ更新（名前変更）・削除 |
| `skills/` | `GET/POST /api/skills` | スキル一覧取得・作成 |
| `skills/[id]/` | `GET/PUT/DELETE /api/skills/[id]` | スキル詳細・更新・削除 |

## ワークスペースAPI詳細

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/workspace/list` | GET | ディレクトリ一覧 |
| `/api/workspace/create` | POST | ワークスペース作成 |
| `/api/workspace/clone` | POST | Gitクローン |
| `/api/workspace/file` | GET/PUT | ファイル読み書き |
| `/api/workspace/file/create` | POST | ファイル・フォルダ作成 |
| `/api/workspace/file/download` | GET | ファイルダウンロード |
| `/api/workspace/file/stream` | GET | ストリーミング読み取り |
| `/api/workspace/delete` | DELETE | ファイル・フォルダ削除 |
| `/api/workspace/rename` | POST | 名前変更 |
| `/api/workspace/upload` | POST | ファイルアップロード |

## 注意事項

- すべてのルートはRoute Handlersを使用（`route.ts`ファイル）
- チャットAPIはSSE（Server-Sent Events）でストリーミングレスポンス
- ワークスペースAPIはパストラバーサル対策を実施
