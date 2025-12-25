/**
 * Claude Agent SDK のビルトインツール定義
 */

export interface ToolDefinition {
  name: string;
  displayName: string;
  description: string;
  category: 'read' | 'write' | 'execute' | 'web' | 'other';
  isDangerous: boolean;
}

/**
 * Claude Agent SDK で使用される主要なツール
 */
export const BUILTIN_TOOLS: ToolDefinition[] = [
  // Read-only tools
  {
    name: 'Read',
    displayName: 'Read',
    description: 'ファイルを読み取る',
    category: 'read',
    isDangerous: false,
  },
  {
    name: 'Glob',
    displayName: 'Glob',
    description: 'パターンでファイルを検索',
    category: 'read',
    isDangerous: false,
  },
  {
    name: 'Grep',
    displayName: 'Grep',
    description: 'ファイル内容を検索',
    category: 'read',
    isDangerous: false,
  },
  {
    name: 'LSP',
    displayName: 'LSP',
    description: 'コード定義・参照を取得',
    category: 'read',
    isDangerous: false,
  },
  {
    name: 'NotebookRead',
    displayName: 'NotebookRead',
    description: 'Jupyter Notebookを読み取る',
    category: 'read',
    isDangerous: false,
  },

  // Write tools
  {
    name: 'Write',
    displayName: 'Write',
    description: 'ファイルを作成・上書き',
    category: 'write',
    isDangerous: true,
  },
  {
    name: 'Edit',
    displayName: 'Edit',
    description: 'ファイルを編集',
    category: 'write',
    isDangerous: true,
  },
  {
    name: 'NotebookEdit',
    displayName: 'NotebookEdit',
    description: 'Jupyter Notebookを編集',
    category: 'write',
    isDangerous: true,
  },

  // Execute tools
  {
    name: 'Bash',
    displayName: 'Bash',
    description: 'シェルコマンドを実行',
    category: 'execute',
    isDangerous: true,
  },
  {
    name: 'KillShell',
    displayName: 'KillShell',
    description: 'シェルプロセスを終了',
    category: 'execute',
    isDangerous: true,
  },

  // Web tools
  {
    name: 'WebFetch',
    displayName: 'WebFetch',
    description: 'URLからコンテンツを取得',
    category: 'web',
    isDangerous: false,
  },
  {
    name: 'WebSearch',
    displayName: 'WebSearch',
    description: 'Web検索を実行',
    category: 'web',
    isDangerous: false,
  },

  // Task/Planning tools
  {
    name: 'Task',
    displayName: 'Task',
    description: 'サブタスクを実行',
    category: 'other',
    isDangerous: false,
  },
  {
    name: 'TaskOutput',
    displayName: 'TaskOutput',
    description: 'タスク出力を取得',
    category: 'other',
    isDangerous: false,
  },
  {
    name: 'TodoWrite',
    displayName: 'TodoWrite',
    description: 'TODOリストを管理',
    category: 'other',
    isDangerous: false,
  },
  {
    name: 'AskUserQuestion',
    displayName: 'AskUserQuestion',
    description: 'ユーザーに質問',
    category: 'other',
    isDangerous: false,
  },
];

/**
 * カテゴリ名の日本語ラベル
 */
export const TOOL_CATEGORIES = {
  read: '読み取り専用',
  write: 'ファイル書き込み',
  execute: 'コマンド実行',
  web: 'Web操作',
  other: 'その他',
} as const;

export type ToolCategory = keyof typeof TOOL_CATEGORIES;

/**
 * カテゴリでツールをグループ化
 */
export function getToolsByCategory(): Array<{
  category: ToolCategory;
  label: string;
  tools: ToolDefinition[];
}> {
  return Object.entries(TOOL_CATEGORIES).map(([key, label]) => ({
    category: key as ToolCategory,
    label,
    tools: BUILTIN_TOOLS.filter((t) => t.category === key),
  }));
}

/**
 * ツール名からツール定義を取得
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return BUILTIN_TOOLS.find((t) => t.name === name);
}

/**
 * 全ツール名のリストを取得
 */
export function getAllToolNames(): string[] {
  return BUILTIN_TOOLS.map((t) => t.name);
}

/**
 * 危険なツール名のリストを取得
 */
export function getDangerousToolNames(): string[] {
  return BUILTIN_TOOLS.filter((t) => t.isDangerous).map((t) => t.name);
}
