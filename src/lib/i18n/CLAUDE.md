# src/lib/i18n/

サーバーサイドの国際化（i18n）ユーティリティを格納するディレクトリです。

## ファイル構成

### server.ts
サーバーサイド翻訳ユーティリティ
- `getServerLocale()`: 設定からサーバーサイドのロケールを取得
- `createServerTranslator(namespace)`: 指定ネームスペースの翻訳関数を生成

## 使用方法

```ts
// API Routeでの使用例
import { createServerTranslator } from '@/lib/i18n/server';

export async function POST(request: Request) {
  const t = await createServerTranslator('session.tag.errors');

  if (!name) {
    return Response.json({ error: t('nameRequired') }, { status: 400 });
  }

  // ...
}
```

## 注意事項

- サーバーサイドでは`useTranslations()`フックは使用不可
- API Routesでは必ず`createServerTranslator()`を使用
- 翻訳関数は非同期（`await`が必要）
