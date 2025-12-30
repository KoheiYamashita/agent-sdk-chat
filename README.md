# Agent SDK Chat

> **注意**: このプロジェクトは個人利用を想定しています。商用及び複数人利用は想定していません。

Claude Agent SDKを使用したブラウザベースのチャットアプリケーションです。ChatGPTライクなインターフェースでClaudeCodeと対話できます。

## デモ

https://github.com/user-attachments/assets/3f392e56-efb6-4d51-85d3-e021e2a93ea6

## 機能

- **リアルタイムチャット**: SSE（Server-Sent Events）によるストリーミングレスポンス
- **思考プロセス表示**: Claudeの思考過程をリアルタイムで確認
- **ツール実行承認**: ツール実行前にユーザー承認を要求するワークフロー
- **セッション管理**: 会話履歴の保存と継続
- **セッションタイトル自動生成**: 会話内容に基づいてタイトルを自動生成
- **カスタムモデル**: システムプロンプトやアイコンをカスタマイズしたモデルを作成
- **スキル機能**: Claude Agent SDKスキルの管理と実行
- **ファイル管理**: ワークスペース内のファイル操作
- **ターミナルアクセス**: ブラウザから直接ターミナルを操作（xterm.js + WebSocket）
- **外観カスタマイズ**: ファビコン設定、UIテーマ

## セットアップ

### 1. 環境変数の設定

プロジェクトルートに`.env`ファイルを作成し、以下の内容を記述してください:

```bash
DATABASE_URL="file:./prisma/dev.db"
ANTHROPIC_API_KEY=your-api-key
```

### 2. インストールと起動

```bash
# 依存関係のインストール
npm install

# Prismaクライアントの生成
npm run db:generate

# データベースマイグレーション
npm run db:migrate

# 本番ビルド
npm run build

# サーバー起動
npm run start
# または バックグラウンドで起動
npm run start:bg
# host指定
npm run start -- --host 0.0.0.0
```

### 3. アクセス

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 開発

```bash
# 開発サーバー起動（ホットリロード）
npm run dev

# ESLint実行
npm run lint

# TypeScript型チェック
npm run typecheck

# Prisma Studio起動
npm run db:studio
```

