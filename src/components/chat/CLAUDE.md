# src/components/chat/

チャット機能に関するコンポーネントを格納しています。

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `ChatContainer.tsx` | チャット画面のメインコンテナ（メッセージ一覧、入力エリア、ツール承認を統合） |
| `ChatHeader.tsx` | チャットヘッダー（ワークスペースバッジ、検索ボタン表示） |
| `InputArea.tsx` | メッセージ入力エリア（テキストエリア、送信ボタン、設定） |
| `MessageList.tsx` | メッセージ一覧表示（スクロール、ページネーション対応） |
| `MessageItem.tsx` | 個別メッセージ表示（user/assistant/system、Thinking表示、検索ハイライト） |
| `MessageSearch.tsx` | メッセージ検索UI（Cmd/Ctrl+Fで開く、マッチ間ナビゲーション） |
| `HighlightedText.tsx` | 検索キーワードハイライト表示 |
| `MarkdownRenderer.tsx` | Markdownレンダリング（コードハイライト、Mermaid対応、検索ハイライト） |
| `ModelSelector.tsx` | モデル選択ドロップダウン（標準+カスタムモデル） |
| `PermissionModeSelector.tsx` | 権限モード選択（normal/auto） |
| `ToolApprovalCard.tsx` | ツール実行承認カード（承認/拒否ボタン） |
| `ToolCallList.tsx` | ツール呼び出し一覧表示 |
| `index.ts` | エクスポート集約 |

## コンポーネント階層

```
ChatContainer
├── MessageSearchProvider（メッセージ検索コンテキスト）
├── ChatHeader（検索ボタン付き）
├── MessageSearch（検索UI）
├── MessageList
│   └── MessageItem
│       ├── HighlightedText（モデル名ハイライト）
│       ├── MarkdownRenderer
│       │   └── HighlightedText（コンテンツハイライト）
│       └── ToolCallList
├── ToolApprovalCard（承認待ちツールがある場合）
└── InputArea
    ├── ModelSelector
    └── PermissionModeSelector
```
