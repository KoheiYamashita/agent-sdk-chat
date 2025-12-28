# src/components/terminal/

ターミナル機能に関するコンポーネントを格納しています。

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `Terminal.tsx` | xterm.jsラッパー（WebSocket接続、入出力処理、リサイズ対応） |
| `TerminalPanel.tsx` | ターミナルパネル（開閉制御、高さ調整） |

## アーキテクチャ

```
TerminalPanel
└── Terminal (xterm.js)
    ↕ WebSocket
server.ts (node-pty)
    ↕ PTY
シェル (bash/zsh)
```

## 注意事項

- WebSocket URLは`ws://localhost:3000/api/terminal`
- セッションごとにPTYインスタンスが作成される
- `TerminalContext`で開閉状態を管理
