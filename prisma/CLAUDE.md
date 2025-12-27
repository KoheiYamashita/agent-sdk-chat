# prisma/

Prisma ORMの設定とデータベーススキーマを管理するディレクトリです。

## ファイル構成

- `schema.prisma` - データベーススキーマ定義
- `migrations/` - マイグレーションファイル
- `dev.db` - 開発用SQLiteデータベース

## データモデル

### Session
チャットセッションを管理します。
- `claudeSessionId`: Claude SDKのセッションID
- `settings`: セッション固有の設定（JSON）
- `allowedTools`: 常に許可されるツールリスト（JSON）

### Message
セッション内のメッセージを管理します。
- `role`: user / assistant / system
- `toolCalls`: ツール呼び出し情報（JSON）
- `metadata`: メタデータ（JSON）

### MCPServer
MCP (Model Context Protocol) サーバー設定を管理します。
- `type`: stdio / sse / http

### Agent
カスタムエージェント設定を管理します。

### Settings
アプリケーション設定を管理します。

## コマンド

```bash
npm run db:migrate   # マイグレーション実行
npm run db:generate  # Prismaクライアント生成
npm run db:studio    # Prisma Studio起動
npm run db:push      # スキーマをDBにプッシュ
```

## 注意事項

- SQLiteを使用しているため、JSONフィールドは文字列として保存されます
- スキーマ変更後は必ず `npm run db:generate` を実行してください
