# src/i18n/

クライアントサイドの国際化（i18n）設定を格納するディレクトリです。

## ファイル構成

### config.ts
ロケール設定
- `locales`: サポートする言語コード（`['ja', 'en', 'zh']`）
- `defaultLocale`: デフォルト言語（`'ja'`）
- `getLocaleFromNavigator()`: ブラウザ言語からロケールを検出

### provider.tsx
I18nProviderコンポーネント
- `NextIntlClientProvider`をラップ
- 設定から言語を読み込み
- `document.documentElement.lang`属性を更新

## 使用方法

```tsx
// layout.tsxでプロバイダーを使用
import { I18nProvider } from '@/i18n/provider';

export default function Layout({ children }) {
  return (
    <I18nProvider>
      {children}
    </I18nProvider>
  );
}
```

## ロケール検出の優先順位

1. ユーザー設定（`settings.general.language`）
2. ブラウザの言語設定（`navigator.language`）
3. デフォルト（日本語）
