/**
 * Claude Agent SDK built-in tool definitions
 */

export interface ToolDefinition {
  name: string;
  displayName: string;
  descriptionKey: string; // Translation key in tools.descriptions namespace
  category: 'read' | 'write' | 'execute' | 'web' | 'other';
  isDangerous: boolean;
}

/**
 * Main tools used by Claude Agent SDK
 */
export const BUILTIN_TOOLS: ToolDefinition[] = [
  // Read-only tools
  {
    name: 'Read',
    displayName: 'Read',
    descriptionKey: 'Read',
    category: 'read',
    isDangerous: false,
  },
  {
    name: 'Glob',
    displayName: 'Glob',
    descriptionKey: 'Glob',
    category: 'read',
    isDangerous: false,
  },
  {
    name: 'Grep',
    displayName: 'Grep',
    descriptionKey: 'Grep',
    category: 'read',
    isDangerous: false,
  },
  {
    name: 'LSP',
    displayName: 'LSP',
    descriptionKey: 'LSP',
    category: 'read',
    isDangerous: false,
  },
  {
    name: 'NotebookRead',
    displayName: 'NotebookRead',
    descriptionKey: 'NotebookRead',
    category: 'read',
    isDangerous: false,
  },

  // Write tools
  {
    name: 'Write',
    displayName: 'Write',
    descriptionKey: 'Write',
    category: 'write',
    isDangerous: true,
  },
  {
    name: 'Edit',
    displayName: 'Edit',
    descriptionKey: 'Edit',
    category: 'write',
    isDangerous: true,
  },
  {
    name: 'NotebookEdit',
    displayName: 'NotebookEdit',
    descriptionKey: 'NotebookEdit',
    category: 'write',
    isDangerous: true,
  },

  // Execute tools
  {
    name: 'Bash',
    displayName: 'Bash',
    descriptionKey: 'Bash',
    category: 'execute',
    isDangerous: true,
  },
  {
    name: 'KillShell',
    displayName: 'KillShell',
    descriptionKey: 'KillShell',
    category: 'execute',
    isDangerous: true,
  },

  // Web tools
  {
    name: 'WebFetch',
    displayName: 'WebFetch',
    descriptionKey: 'WebFetch',
    category: 'web',
    isDangerous: false,
  },
  {
    name: 'WebSearch',
    displayName: 'WebSearch',
    descriptionKey: 'WebSearch',
    category: 'web',
    isDangerous: false,
  },

  // Task/Planning tools
  {
    name: 'Task',
    displayName: 'Task',
    descriptionKey: 'Task',
    category: 'other',
    isDangerous: false,
  },
  {
    name: 'TaskOutput',
    displayName: 'TaskOutput',
    descriptionKey: 'TaskOutput',
    category: 'other',
    isDangerous: false,
  },
  {
    name: 'TodoWrite',
    displayName: 'TodoWrite',
    descriptionKey: 'TodoWrite',
    category: 'other',
    isDangerous: false,
  },
  {
    name: 'AskUserQuestion',
    displayName: 'AskUserQuestion',
    descriptionKey: 'AskUserQuestion',
    category: 'other',
    isDangerous: false,
  },
  {
    name: 'Skill',
    displayName: 'Skill',
    descriptionKey: 'Skill',
    category: 'other',
    isDangerous: false,
  },
];

/**
 * Category keys for translation (use with t('tools.categories.${key}'))
 */
export const TOOL_CATEGORY_KEYS = ['read', 'write', 'execute', 'web', 'other'] as const;

export type ToolCategory = (typeof TOOL_CATEGORY_KEYS)[number];

/**
 * Group tools by category
 * Use with useTranslations('tools') to get translated labels
 */
export function getToolsByCategory(): Array<{
  category: ToolCategory;
  categoryKey: string;
  tools: ToolDefinition[];
}> {
  return TOOL_CATEGORY_KEYS.map((key) => ({
    category: key,
    categoryKey: `categories.${key}`,
    tools: BUILTIN_TOOLS.filter((t) => t.category === key),
  }));
}

/**
 * Get tool definition by name
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return BUILTIN_TOOLS.find((t) => t.name === name);
}

/**
 * Get list of all tool names
 */
export function getAllToolNames(): string[] {
  return BUILTIN_TOOLS.map((t) => t.name);
}

/**
 * Get list of dangerous tool names
 */
export function getDangerousToolNames(): string[] {
  return BUILTIN_TOOLS.filter((t) => t.isDangerous).map((t) => t.name);
}
