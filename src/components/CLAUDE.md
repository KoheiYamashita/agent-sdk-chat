# src/components/

UIコンポーネントを格納するディレクトリです。

## ディレクトリ構成

### chat/
チャット関連のコンポーネント
- `ChatContainer.tsx` - チャット画面のメインコンテナ
- `ChatHeader.tsx` - チャットヘッダー
- `InputArea.tsx` - メッセージ入力エリア
- `MessageList.tsx` - メッセージ一覧
- `MessageItem.tsx` - 個別メッセージ表示
- `MarkdownRenderer.tsx` - Markdownレンダリング
- `ToolCallList.tsx` - ツール呼び出し一覧
- `ToolApprovalCard.tsx` - ツール承認カード
- `PermissionModeSelector.tsx` - 権限モード選択

### sidebar/
サイドバー関連のコンポーネント
- `Sidebar.tsx` - メインサイドバー
- `SessionList.tsx` - セッション一覧
- `SessionItem.tsx` - 個別セッション項目

### settings/
設定関連のコンポーネント
- `AppearanceSettingsForm.tsx` - 外観設定フォーム
- `DefaultToolsCheckboxGroup.tsx` - デフォルトツール選択
- `PermissionModeRadioGroup.tsx` - 権限モード選択
- `SandboxSettingsForm.tsx` - サンドボックス設定

### terminal/
ターミナル関連のコンポーネント
- `Terminal.tsx` - xterm.jsを使用したターミナル
- `TerminalPanel.tsx` - ターミナルパネル

### workspace/
ワークスペース関連のコンポーネント
- `WorkspaceSelector.tsx` - ワークスペース選択
- `WorkspaceTree.tsx` - ファイルツリー表示
- `WorkspaceTreeItem.tsx` - ツリー項目
- `WorkspaceBadge.tsx` - ワークスペースバッジ
- `GitCloneForm.tsx` - Gitクローンフォーム

### ui/
shadcn/ui ベースの基本UIコンポーネント
- `button.tsx`, `input.tsx`, `card.tsx` など
- Radix UIをベースとしています

## 注意事項

- UIコンポーネントは `ui/` にあり、shadcn/ui のCLIで追加可能です
- 機能コンポーネントはそれぞれのサブディレクトリに配置してください
- コンポーネントはすべてReact Server Components互換ですが、`"use client"` が必要な場合は明示してください
