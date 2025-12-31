import { describe, it, expect } from 'vitest';
import {
  BUILTIN_TOOLS,
  TOOL_CATEGORY_KEYS,
  getToolsByCategory,
  getToolByName,
  getAllToolNames,
  getDangerousToolNames,
} from '../tools';

describe('tools constants', () => {
  describe('BUILTIN_TOOLS', () => {
    it('should have all required properties for each tool', () => {
      BUILTIN_TOOLS.forEach((tool) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('displayName');
        expect(tool).toHaveProperty('descriptionKey');
        expect(tool).toHaveProperty('category');
        expect(tool).toHaveProperty('isDangerous');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.displayName).toBe('string');
        expect(typeof tool.descriptionKey).toBe('string');
        expect(typeof tool.isDangerous).toBe('boolean');
      });
    });

    it('should have valid categories', () => {
      BUILTIN_TOOLS.forEach((tool) => {
        expect(TOOL_CATEGORY_KEYS).toContain(tool.category);
      });
    });

    it('should include essential tools', () => {
      const toolNames = BUILTIN_TOOLS.map((t) => t.name);
      expect(toolNames).toContain('Read');
      expect(toolNames).toContain('Write');
      expect(toolNames).toContain('Edit');
      expect(toolNames).toContain('Bash');
      expect(toolNames).toContain('Glob');
      expect(toolNames).toContain('Grep');
    });
  });

  describe('TOOL_CATEGORY_KEYS', () => {
    it('should contain all expected categories', () => {
      expect(TOOL_CATEGORY_KEYS).toContain('read');
      expect(TOOL_CATEGORY_KEYS).toContain('write');
      expect(TOOL_CATEGORY_KEYS).toContain('execute');
      expect(TOOL_CATEGORY_KEYS).toContain('web');
      expect(TOOL_CATEGORY_KEYS).toContain('other');
    });

    it('should have exactly 5 categories', () => {
      expect(TOOL_CATEGORY_KEYS.length).toBe(5);
    });
  });

  describe('getToolsByCategory', () => {
    it('should return array with all categories', () => {
      const result = getToolsByCategory();
      expect(result.length).toBe(TOOL_CATEGORY_KEYS.length);
    });

    it('should have correct structure for each category group', () => {
      const result = getToolsByCategory();
      result.forEach((group) => {
        expect(group).toHaveProperty('category');
        expect(group).toHaveProperty('categoryKey');
        expect(group).toHaveProperty('tools');
        expect(Array.isArray(group.tools)).toBe(true);
        expect(group.categoryKey).toBe(`categories.${group.category}`);
      });
    });

    it('should group read tools together', () => {
      const result = getToolsByCategory();
      const readGroup = result.find((g) => g.category === 'read');
      expect(readGroup).toBeDefined();
      const readToolNames = readGroup!.tools.map((t) => t.name);
      expect(readToolNames).toContain('Read');
      expect(readToolNames).toContain('Glob');
      expect(readToolNames).toContain('Grep');
    });

    it('should group write tools together', () => {
      const result = getToolsByCategory();
      const writeGroup = result.find((g) => g.category === 'write');
      expect(writeGroup).toBeDefined();
      const writeToolNames = writeGroup!.tools.map((t) => t.name);
      expect(writeToolNames).toContain('Write');
      expect(writeToolNames).toContain('Edit');
    });

    it('should group execute tools together', () => {
      const result = getToolsByCategory();
      const executeGroup = result.find((g) => g.category === 'execute');
      expect(executeGroup).toBeDefined();
      const executeToolNames = executeGroup!.tools.map((t) => t.name);
      expect(executeToolNames).toContain('Bash');
    });
  });

  describe('getToolByName', () => {
    it('should return correct tool for valid name', () => {
      const readTool = getToolByName('Read');
      expect(readTool).toBeDefined();
      expect(readTool!.name).toBe('Read');
      expect(readTool!.category).toBe('read');
      expect(readTool!.isDangerous).toBe(false);
    });

    it('should return correct tool for Bash', () => {
      const bashTool = getToolByName('Bash');
      expect(bashTool).toBeDefined();
      expect(bashTool!.name).toBe('Bash');
      expect(bashTool!.category).toBe('execute');
      expect(bashTool!.isDangerous).toBe(true);
    });

    it('should return undefined for non-existent tool', () => {
      const result = getToolByName('NonExistentTool');
      expect(result).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      const result = getToolByName('read'); // lowercase
      expect(result).toBeUndefined();
    });
  });

  describe('getAllToolNames', () => {
    it('should return array of strings', () => {
      const result = getAllToolNames();
      expect(Array.isArray(result)).toBe(true);
      result.forEach((name) => {
        expect(typeof name).toBe('string');
      });
    });

    it('should return same number of tools as BUILTIN_TOOLS', () => {
      const result = getAllToolNames();
      expect(result.length).toBe(BUILTIN_TOOLS.length);
    });

    it('should include all tool names', () => {
      const result = getAllToolNames();
      expect(result).toContain('Read');
      expect(result).toContain('Write');
      expect(result).toContain('Bash');
      expect(result).toContain('WebFetch');
    });
  });

  describe('getDangerousToolNames', () => {
    it('should return array of strings', () => {
      const result = getDangerousToolNames();
      expect(Array.isArray(result)).toBe(true);
      result.forEach((name) => {
        expect(typeof name).toBe('string');
      });
    });

    it('should include dangerous tools', () => {
      const result = getDangerousToolNames();
      expect(result).toContain('Write');
      expect(result).toContain('Edit');
      expect(result).toContain('Bash');
    });

    it('should not include safe tools', () => {
      const result = getDangerousToolNames();
      expect(result).not.toContain('Read');
      expect(result).not.toContain('Glob');
      expect(result).not.toContain('Grep');
      expect(result).not.toContain('WebFetch');
    });

    it('should match tools with isDangerous=true', () => {
      const result = getDangerousToolNames();
      const dangerousTools = BUILTIN_TOOLS.filter((t) => t.isDangerous);
      expect(result.length).toBe(dangerousTools.length);
      dangerousTools.forEach((tool) => {
        expect(result).toContain(tool.name);
      });
    });
  });
});
