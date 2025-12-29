/**
 * 検証用テストデータ生成スクリプト
 * 使い方: npx tsx scripts/seed-test-data.ts
 */

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`,
});

const prisma = new PrismaClient({ adapter });

const SESSION_COUNT = 50; // 生成するセッション数
const MESSAGES_PER_SESSION_MIN = 20; // セッションあたりの最小メッセージ数
const MESSAGES_PER_SESSION_MAX = 100; // セッションあたりの最大メッセージ数

// サンプルのトピック
const topics = [
  'TypeScript',
  'React',
  'Next.js',
  'Prisma',
  'データベース設計',
  'API開発',
  'テスト自動化',
  'Docker',
  'Kubernetes',
  'AWS',
  'パフォーマンス最適化',
  'セキュリティ',
  'CI/CD',
  'GraphQL',
  'REST API',
  'WebSocket',
  'Redis',
  'PostgreSQL',
  'MongoDB',
  'エラーハンドリング',
];

// サンプルのユーザーメッセージ
const userMessages = [
  'この機能を実装する方法を教えてください',
  'エラーが発生しています。原因を調べてください',
  'コードをレビューしてください',
  'パフォーマンスを改善したいです',
  'ベストプラクティスを教えてください',
  'テストを書いてください',
  'リファクタリングしてください',
  'ドキュメントを追加してください',
  'この設計についてどう思いますか？',
  'セキュリティの観点から問題はありますか？',
  'デバッグを手伝ってください',
  'この概念を説明してください',
  'サンプルコードを見せてください',
  '比較してメリット・デメリットを教えてください',
  'この問題の解決策を提案してください',
];

// サンプルのアシスタントメッセージ（長め）
const assistantMessages = [
  `もちろんです。この機能を実装するには、以下のステップに従ってください：

1. まず、必要な依存関係をインストールします
2. 次に、設定ファイルを作成します
3. コンポーネントを実装します
4. テストを追加します

コード例：
\`\`\`typescript
export function example() {
  console.log('Hello, World!');
}
\`\`\`

これで基本的な実装が完了します。`,

  `エラーの原因を調査しました。問題は以下の点にあります：

- 変数が未定義のまま使用されている
- 非同期処理の待機が不足している
- 型の不一致がある

修正方法：
\`\`\`typescript
async function fetchData() {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
\`\`\`

これで問題が解決するはずです。`,

  `コードレビューの結果をお伝えします。

良い点：
- 命名規則が一貫している
- 適切なエラーハンドリング
- コメントが分かりやすい

改善点：
- 一部の関数が長すぎる（分割を推奨）
- マジックナンバーを定数化すべき
- テストカバレッジを向上させるべき

全体的には良い品質のコードです。`,

  `パフォーマンス改善のための提案：

1. **メモ化**: useMemoやuseCallbackを活用
2. **遅延ロード**: React.lazyでコード分割
3. **仮想化**: 大量リストにはvirtualizationを使用
4. **キャッシュ**: APIレスポンスをキャッシュ
5. **バンドルサイズ**: 不要な依存関係を削除

\`\`\`typescript
const MemoizedComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});
\`\`\``,

  `ベストプラクティスについて説明します。

## コーディング規約
- 一貫した命名規則を使用
- 小さな関数を書く
- 副作用を分離する

## アーキテクチャ
- 関心の分離を意識
- 依存性注入を活用
- テスタブルなコードを書く

## セキュリティ
- 入力値を必ず検証
- 適切な認証・認可
- 機密情報は環境変数で管理`,
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSessionTitle(index: number): string {
  const topic = randomElement(topics);
  const actions = ['について質問', 'の実装', 'のデバッグ', 'の設計', 'の最適化', 'について相談'];
  const action = randomElement(actions);
  return `${topic}${action} #${index + 1}`;
}

async function main() {
  console.log('テストデータの生成を開始します...\n');

  const startTime = Date.now();
  let totalMessages = 0;

  for (let i = 0; i < SESSION_COUNT; i++) {
    const messageCount = randomInt(MESSAGES_PER_SESSION_MIN, MESSAGES_PER_SESSION_MAX);
    const sessionDate = new Date(Date.now() - randomInt(0, 30 * 24 * 60 * 60 * 1000)); // 過去30日以内

    // セッション作成
    const session = await prisma.session.create({
      data: {
        title: generateSessionTitle(i),
        createdAt: sessionDate,
        updatedAt: sessionDate,
        isArchived: Math.random() < 0.1, // 10%をアーカイブ
      },
    });

    // メッセージ作成
    const messages = [];
    let currentDate = new Date(sessionDate);

    for (let j = 0; j < messageCount; j++) {
      const isUser = j % 2 === 0;
      currentDate = new Date(currentDate.getTime() + randomInt(1000, 60000)); // 1秒〜1分後

      messages.push({
        sessionId: session.id,
        role: isUser ? 'user' : 'assistant',
        content: isUser ? randomElement(userMessages) : randomElement(assistantMessages),
        createdAt: currentDate,
        model: isUser ? null : 'claude-sonnet-4-20250514',
        modelDisplayName: isUser ? null : (Math.random() < 0.3 ? 'カスタムモデル' : null),
        inputTokens: isUser ? null : randomInt(100, 500),
        outputTokens: isUser ? null : randomInt(200, 1000),
      });
    }

    await prisma.message.createMany({
      data: messages,
    });

    totalMessages += messageCount;

    // 進捗表示
    if ((i + 1) % 10 === 0 || i === SESSION_COUNT - 1) {
      console.log(`  ${i + 1}/${SESSION_COUNT} セッション作成完了 (累計メッセージ: ${totalMessages})`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n完了しました！`);
  console.log(`  セッション数: ${SESSION_COUNT}`);
  console.log(`  メッセージ数: ${totalMessages}`);
  console.log(`  所要時間: ${elapsed}秒`);
}

main()
  .catch((e) => {
    console.error('エラーが発生しました:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
