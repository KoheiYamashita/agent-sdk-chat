/**
 * Skill database model
 */
export interface Skill {
  id: string;
  name: string; // URL-safe identifier (e.g., "code-review")
  displayName: string;
  description?: string | null;
  content: string; // SKILL.md content (YAML frontmatter + markdown)
  isEnabled: boolean; // Global default enabled state (for file output)
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Skill override state for CustomModel and Session
 * - 'enabled': Force enable this skill
 * - 'disabled': Force disable this skill
 * - 'default': Use parent setting (CustomModel -> Global, Session -> CustomModel -> Global)
 */
export type SkillOverrideState = 'enabled' | 'disabled' | 'default';

/**
 * Skill settings map (stored as JSON in DB)
 * Key: skill ID, Value: override state
 */
export type SkillSettings = Record<string, SkillOverrideState>;

/**
 * API Request: Create a new skill
 */
export interface SkillCreateRequest {
  name: string;
  displayName: string;
  description?: string;
  content: string;
}

/**
 * API Request: Update an existing skill
 */
export interface SkillUpdateRequest {
  name?: string;
  displayName?: string;
  description?: string | null;
  content?: string;
  isEnabled?: boolean;
  sortOrder?: number;
}

/**
 * API Response: List of skills
 */
export interface SkillsResponse {
  skills: Skill[];
}

/**
 * Resolved skill state after applying priority rules
 */
export interface ResolvedSkillState {
  isEnabled: boolean;
  source: 'global' | 'customModel' | 'session';
}

/**
 * Helper function to resolve skill enabled state based on priority
 * Priority: session > customModel > global
 */
export function resolveSkillEnabled(
  skill: Skill,
  customModelSettings?: SkillSettings | null,
  sessionSettings?: SkillSettings | null
): ResolvedSkillState {
  // 1. Session settings (highest priority)
  const sessionState = sessionSettings?.[skill.id];
  if (sessionState === 'enabled') {
    return { isEnabled: true, source: 'session' };
  }
  if (sessionState === 'disabled') {
    return { isEnabled: false, source: 'session' };
  }

  // 2. CustomModel settings
  const customModelState = customModelSettings?.[skill.id];
  if (customModelState === 'enabled') {
    return { isEnabled: true, source: 'customModel' };
  }
  if (customModelState === 'disabled') {
    return { isEnabled: false, source: 'customModel' };
  }

  // 3. Global default
  return { isEnabled: skill.isEnabled, source: 'global' };
}
