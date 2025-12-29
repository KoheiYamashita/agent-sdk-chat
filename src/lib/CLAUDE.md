# src/lib/

ライブラリ・ユーティリティ関数を格納するディレクトリです。

## ディレクトリ構成

### claude/
Claude Agent SDKとの連携モジュール
- SDKの初期化
- セッション管理
- ストリーミング処理

### db/
データベース関連
- Prismaクライアントのインスタンス管理

### utils/
汎用ユーティリティ関数

### constants/
定数定義

## 主要ファイル

### approval-manager.ts
ツール実行承認の管理
- 承認待ちのツール呼び出しをキューで管理（セッションID紐づけ）
- 承認/拒否の結果をPromiseで返す
- `getPendingForSession()`: セッションの待機中承認リクエストを取得（リロード時状態復元用）

### providers.tsx
Reactプロバイダーの統合
- QueryClientProvider (TanStack Query)
- ThemeProvider
- その他のContextプロバイダー

### utils.ts
汎用ユーティリティ
- `cn()`: Tailwind CSSクラス名の結合（clsx + tailwind-merge）

## 注意事項

- `claude/` 配下はClaude Agent SDKの使用に特化しています
- 新しいユーティリティは適切なサブディレクトリに配置してください
