# src/lib/claude/

Claude Agent SDKとの連携モジュールです。

## ファイル構成

- `client.ts` - Claude Agent SDKクライアントの初期化
- `session-manager.ts` - セッション管理（claudeSessionIdの取得・更新）
- `types.ts` - SDK関連の型定義

## 使用方法

```typescript
import { createClaudeClient } from '@/lib/claude/client';
import { getOrCreateClaudeSessionId } from '@/lib/claude/session-manager';

const client = createClaudeClient();
const claudeSessionId = await getOrCreateClaudeSessionId(sessionId);
```
