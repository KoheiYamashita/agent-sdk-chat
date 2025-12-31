import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Claude Agent SDK をグローバルでモック
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));
