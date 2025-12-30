# src/types/

TypeScript型定義を格納するディレクトリです。

## ファイル構成

### chat.ts
チャット関連の型定義
- `Message`: メッセージ型
- `ToolCall`: ツール呼び出し型
- `StreamEvent`: ストリーミングイベント型

### session.ts
セッション関連の型定義
- `Session`: セッション型（`isProcessing`, `pendingToolApproval`はランタイム状態）
- `SessionSummary`: セッション一覧用の型（`tagId`, `tagName`含む）
- `SessionSettings`: セッション設定型

### tag.ts
タグ関連の型定義
- `Tag`: タグ型
- `TagWithSessionCount`: セッション数付きタグ型
- `TagsResponse`: タグ一覧レスポンス型
- `TagCreateRequest`: タグ作成リクエスト型
- `TagUpdateRequest`: タグ更新リクエスト型

### settings.ts
設定関連の型定義
- `SettingsData`: アプリケーション設定型
- `AppearanceSettings`: 外観設定型
- `SandboxSettings`: ワークスペース設定型（`workspacePath`, `claudeMdTemplate`）
- `TitleGenerationSettings`: タイトル自動生成設定型（`enabled`, `model`, `prompt`）
- `DangerSettings`: 危険な設定型（`showUsage`）

### terminal.ts
ターミナル関連の型定義
- `TerminalMessage`: WebSocketメッセージ型
- `TerminalSession`: ターミナルセッション型

### usage.ts
使用状況関連の型定義
- `UsageStats`: 使用統計型

### workspace.ts
ワークスペース関連の型定義
- `DirectoryItem`: ディレクトリ項目型
- `DirectoryListResponse`: ディレクトリ一覧レスポンス型
- `GitCloneRequest/Response`: Gitクローン型
- `FileReadResponse`: ファイル読み取りレスポンス型（encoding対応）
- `FileSaveRequest/Response`: ファイル保存型
- `FileCreateRequest/Response`: ファイル作成型
- `DeleteRequest/Response`: 削除型
- `RenameRequest/Response`: 名前変更型

### search.ts
検索関連の型定義
- `SearchSessionResult`: セッション検索結果型（`tagId`, `tagName`含む）
- `SessionSearchResponse`: セッション検索レスポンス型
- `SearchMessageResult`: メッセージ検索結果型
- `MessageSearchResponse`: メッセージ検索レスポンス型

### skills.ts
スキル関連の型定義
- `Skill`: スキル型
- `SkillSettings`: スキル設定型（`Record<string, SkillOverrideState>`）
- `SkillOverrideState`: スキル上書き状態（`'enabled' | 'disabled' | 'default'`）

### index.ts
型のエクスポート集約

## 注意事項

- Prismaが生成する型は `src/generated/prisma` にあります
- アプリケーション固有の型はここに定義してください
- APIレスポンスの型もここで管理しています
