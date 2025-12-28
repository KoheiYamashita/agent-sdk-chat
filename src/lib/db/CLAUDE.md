# src/lib/db/

データベース関連のモジュールです。

## ファイル構成

- `prisma.ts` - Prismaクライアントのシングルトンインスタンス

## 使用方法

```typescript
import { prisma } from '@/lib/db/prisma';

const sessions = await prisma.session.findMany();
```

## 注意事項

- 開発時のホットリロードでインスタンスが重複しないようglobalThisを使用
