# src/terminal-server/

WebSocketベースのターミナルサーバーモジュールです。

## ファイル構成

### handler.ts
WebSocket接続のハンドラー
- PTY（疑似端末）の作成・管理
- WebSocketメッセージの処理
- ターミナルのリサイズ処理
- セッションのライフサイクル管理

主要な機能:
- `handleConnection()`: 新規WebSocket接続の処理
- PTYからの出力をWebSocketに転送
- WebSocketからの入力をPTYに転送
- ターミナルリサイズコマンドの処理

### session-store.ts
ターミナルセッションの管理
- セッションIDごとのPTYインスタンス管理
- セッションの作成・取得・削除

## アーキテクチャ

```
ブラウザ (xterm.js)
    ↕ WebSocket
ターミナルサーバー (handler.ts)
    ↕ PTY
シェル (bash/zsh)
```

## 注意事項

- node-ptyを使用しているため、ネイティブモジュールのビルドが必要です
- server.tsで Next.js サーバーと統合されています
- WebSocket URLは `ws://localhost:3000/terminal` です
