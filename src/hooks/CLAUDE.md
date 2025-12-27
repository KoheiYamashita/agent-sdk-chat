# src/hooks/

カスタムReact Hooksを格納するディレクトリです。

## ファイル構成

### useChat.ts
チャット機能のメインフック
- メッセージの送信・受信
- ストリーミングレスポンスの処理
- ツール承認・拒否
- セッション管理との連携

主要な機能:
- `sendMessage()`: メッセージ送信
- `approveToolCall()`: ツール実行承認
- `rejectToolCall()`: ツール実行拒否
- `abortChat()`: チャット中断

### useSessions.ts
セッション管理フック（TanStack Query使用）
- `sessions`: セッション一覧
- `createSession()`: 新規セッション作成
- `updateSession()`: セッション更新
- `deleteSession()`: セッション削除

### useSettings.ts
設定管理フック
- `settings`: 現在の設定
- `updateSettings()`: 設定更新

### useUsage.ts
使用状況取得フック
- `usage`: トークン使用量などの統計情報

## 注意事項

- TanStack Queryを使用してサーバー状態を管理しています
- `useChat`は複雑なストリーミング処理を含むため、変更時は注意してください
