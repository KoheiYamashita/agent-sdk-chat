# src/components/sidebar/

サイドバーに関するコンポーネントを格納しています。

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `Sidebar.tsx` | メインサイドバー（ナビゲーション、セッション一覧、新規チャットボタン、検索） |
| `SessionList.tsx` | セッション一覧表示（タググループ化、検索結果表示対応） |
| `SessionItem.tsx` | 個別セッション項目（タイトル編集、削除、アーカイブ、タグ設定） |
| `SessionSearch.tsx` | セッション検索入力（タイトル・メッセージ内容・モデル名で検索） |
| `TagGroupHeader.tsx` | タググループヘッダー（展開/折りたたみ、名前変更、削除） |
| `TagSelectDialog.tsx` | タグ選択ダイアログ（既存タグ選択、新規タグ作成） |
| `TagRenameDialog.tsx` | タグ名変更ダイアログ |
| `index.ts` | エクスポート集約 |

## コンポーネント階層

```
Sidebar
├── ナビゲーションリンク（チャット、ファイル、設定、使用状況）
├── 新規チャットボタン
├── SessionSearch（セッション検索）
└── SessionList
    ├── TagGroupHeader（タググループごと）
    │   └── SessionItem（複数）
    ├── TagSelectDialog（タグ選択）
    └── TagRenameDialog（タグ名変更）
```
