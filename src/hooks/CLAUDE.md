# src/hooks/

カスタムReact Hooksを格納するディレクトリです。

## ファイル構成

### useChat.ts
チャット機能のメインフック
- メッセージの送信・受信
- ストリーミングレスポンスの処理
- ツール承認・拒否
- セッション管理との連携
- ページリロード時の状態復元とポーリング

主要な機能:
- `sendMessage()`: メッセージ送信
- `approveToolCall()`: ツール実行承認
- `rejectToolCall()`: ツール実行拒否
- `abortChat()`: チャット中断
- リロード時: サーバーから`isProcessing`/`pendingToolApproval`を復元、ポーリングで処理完了を監視

### useSessions.ts
セッション管理フック（TanStack Query使用）
- `sessions`: セッション一覧
- `createSession()`: 新規セッション作成
- `updateSession()`: セッション更新
- `deleteSession()`: セッション削除
- `toggleArchive()`: アーカイブ切り替え
- `setSessionTag()`: セッションにタグを設定

### useTags.ts
タグ管理フック（TanStack Query使用）
- `tags`: タグ一覧（セッション数含む）
- `createTag()`: 新規タグ作成
- `updateTag()`: タグ更新（名前変更）
- `deleteTag()`: タグ削除
- `isLoading`, `isCreating`, `isUpdating`, `isDeleting`: 各操作のローディング状態
- `createError`, `updateError`, `deleteError`: 各操作のエラー状態

### useSettings.ts
設定管理フック
- `settings`: 現在の設定
- `updateGeneralSettings()`: 一般設定更新
- `updateAppearanceSettings()`: 外観設定更新
- `updateTitleGenerationSettings()`: タイトル生成設定更新
- `updateDangerSettings()`: 危険な設定更新（`showUsage`など）
- `saveSettings()`: 設定保存

### useUsage.ts
使用状況取得フック
- `usage`: トークン使用量などの統計情報

### useSessionSearch.ts
セッション検索フック（デバウンス付き）
- `query`: 検索クエリ
- `setQuery()`: クエリ設定
- `results`: 検索結果（セッション一覧）
- `isSearching`: 検索中フラグ
- `clearSearch()`: 検索クリア

### useSkills.ts
スキル管理フック（TanStack Query使用）
- `skills`: スキル一覧
- `createSkill()`: 新規スキル作成
- `updateSkill()`: スキル更新
- `deleteSkill()`: スキル削除
- `resolveSkillEnabled()`: スキル有効状態の解決（グローバル→モデル→セッション）

## 注意事項

- TanStack Queryを使用してサーバー状態を管理しています
- `useChat`は複雑なストリーミング処理を含むため、変更時は注意してください
