# src/components/ui/

shadcn/uiベースの基本UIコンポーネントを格納しています。

## 概要

このディレクトリにはRadix UIをベースとしたshadcn/uiコンポーネントが配置されています。
コンポーネントは`npx shadcn@latest add <component>`で追加できます。

## 主要コンポーネント

- `button.tsx` - ボタン（variant: default, destructive, outline, secondary, ghost, link）
- `input.tsx` - テキスト入力
- `card.tsx` - カード
- `dialog.tsx` - モーダルダイアログ
- `dropdown-menu.tsx` - ドロップダウンメニュー
- `select.tsx` - セレクトボックス
- `checkbox.tsx` - チェックボックス
- `radio-group.tsx` - ラジオボタングループ
- `tabs.tsx` - タブ
- `scroll-area.tsx` - スクロールエリア
- `sheet.tsx` - サイドシート
- `skeleton.tsx` - ローディングスケルトン
- その他多数

## 注意事項

- これらのコンポーネントは直接編集可能です
- スタイルはTailwind CSSで定義されています
- 新しいコンポーネントが必要な場合は`npx shadcn@latest add`を使用してください
