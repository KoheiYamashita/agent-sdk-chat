# messages/

国際化（i18n）用の翻訳ファイルを格納するディレクトリです。

## ファイル構成

| ファイル | 言語 |
|----------|------|
| `ja.json` | 日本語（デフォルト） |
| `en.json` | 英語 |
| `zh.json` | 中国語（簡体字） |

## 翻訳キーの構造

翻訳はネームスペースで整理されています:

```json
{
  "common": { ... },      // 共通（キャンセル、保存など）
  "sidebar": { ... },     // サイドバー
  "chat": { ... },        // チャット画面
  "toolApproval": { ... }, // ツール承認ダイアログ
  "session": { ... },     // セッション管理
  "settings": { ... },    // 設定画面
  "files": { ... },       // ファイル管理
  "usage": { ... },       // 使用量表示
  "workspace": { ... },   // ワークスペース
  "models": { ... },      // カスタムモデル
  "skills": { ... },      // Skills管理
  "tools": { ... }        // ツール定義
}
```

## 翻訳の追加方法

1. `ja.json`に新しいキーを追加（基準ファイル）
2. `en.json`と`zh.json`に同じキーで翻訳を追加
3. コンポーネントで`useTranslations()`を使用

```tsx
// クライアントコンポーネント
const t = useTranslations('settings');
return <span>{t('title')}</span>;

// パラメータ付き
const t = useTranslations('chat');
return <span>{t('skillsEnabled', { count: 3, total: 5 })}</span>;
```

## 注意事項

- 全ての言語ファイルで同じキー構造を維持すること
- パラメータは`{paramName}`形式で指定
- 複数形は`{count}`パラメータと組み合わせて使用
