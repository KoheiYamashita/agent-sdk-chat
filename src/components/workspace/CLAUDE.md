# src/components/workspace/

ワークスペース・ファイル管理に関するコンポーネントを格納しています。

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `WorkspaceSelector.tsx` | ワークスペース選択ダイアログ |
| `WorkspaceTree.tsx` | ワークスペースのディレクトリツリー表示 |
| `WorkspaceTreeItem.tsx` | ツリー項目（フォルダ展開、ファイル選択） |
| `WorkspaceBadge.tsx` | 現在のワークスペースパス表示バッジ |
| `FileBrowserTree.tsx` | ファイルブラウザのツリー表示（/filesページ用） |
| `FileBrowserItem.tsx` | ファイル項目（パスコピー、ダウンロード、削除、名前変更） |
| `FilePreview.tsx` | ファイルプレビュー・編集（画像、動画、コード、テキスト対応） |
| `GitCloneForm.tsx` | Gitリポジトリクローンフォーム |
| `CsvPreview.tsx` | CSVファイルのテーブル表示 |
| `JsonPreview.tsx` | JSONファイルのツリー表示 |
| `MermaidRenderer.tsx` | Mermaidダイアグラムのレンダリング |
| `index.ts` | エクスポート集約 |

## 注意事項

- ファイル操作は`/api/workspace/*`エンドポイントを使用
- パス検証はサーバー側で実施（パストラバーサル対策）
