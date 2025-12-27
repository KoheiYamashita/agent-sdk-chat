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
- `Session`: セッション型
- `SessionSettings`: セッション設定型

### settings.ts
設定関連の型定義
- `Settings`: アプリケーション設定型
- `AppearanceSettings`: 外観設定型

### terminal.ts
ターミナル関連の型定義
- `TerminalMessage`: WebSocketメッセージ型
- `TerminalSession`: ターミナルセッション型

### usage.ts
使用状況関連の型定義
- `UsageStats`: 使用統計型

### workspace.ts
ワークスペース関連の型定義
- `Workspace`: ワークスペース型
- `FileNode`: ファイルノード型

### index.ts
型のエクスポート集約

## 注意事項

- Prismaが生成する型は `src/generated/prisma` にあります
- アプリケーション固有の型はここに定義してください
- APIレスポンスの型もここで管理しています
