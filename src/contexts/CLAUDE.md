# src/contexts/

React Contextプロバイダーを格納するディレクトリです。

## ファイル構成

### SidebarContext.tsx
サイドバーの開閉状態を管理するContext
- `isOpen`: サイドバーの開閉状態
- `toggle()`: 開閉トグル
- `open()`, `close()`: 明示的な開閉

### TerminalContext.tsx
ターミナルの状態を管理するContext
- `isOpen`: ターミナルパネルの開閉状態
- `height`: ターミナルパネルの高さ
- `toggle()`, `open()`, `close()`: 開閉制御
- `setHeight()`: 高さ設定

### MessageSearchContext.tsx
チャット内メッセージ検索の状態を管理するContext
- `query`: 検索クエリ
- `matches`: 検索マッチ一覧
- `currentMatchIndex`: 現在のマッチインデックス
- `open()`, `close()`: 検索パネル開閉
- `goToNext()`, `goToPrev()`: マッチ間ナビゲーション

**注意**: このContextはメッセージ配列を必要とするため、`ChatContainer`内でローカルに使用されます。

## 使用方法

```tsx
// プロバイダーでラップ
<SidebarProvider>
  <TerminalProvider>
    {children}
  </TerminalProvider>
</SidebarProvider>

// コンポーネント内で使用
const { isOpen, toggle } = useSidebar();
const { isOpen, setHeight } = useTerminal();
```

## 注意事項

- グローバルなContextは `src/lib/providers.tsx` で統合されています
- 新しいグローバルContextを追加する場合は、providersにも追加してください
- 特定のpropsを必要とするContext（例: MessageSearchContext）はコンポーネント内でローカルに使用可能です
