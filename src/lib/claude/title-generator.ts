import { query as sdkQuery } from '@anthropic-ai/claude-agent-sdk';
import type { TitleGenerationSettings } from '@/types';

// Default Haiku model (will be used if settings.model is empty)
const DEFAULT_HAIKU_MODEL = 'claude-3-5-haiku-20241022';

interface GenerateTitleOptions {
  userMessage: string;
  settings: TitleGenerationSettings;
}

/**
 * Generate a concise session title using Claude.
 * Returns the generated title, or null if generation fails.
 */
export async function generateSessionTitle(
  options: GenerateTitleOptions
): Promise<string | null> {
  const { userMessage, settings } = options;

  if (!settings.enabled) {
    return null;
  }

  // Use user message directly (truncated to 1000 chars)
  const userInput = userMessage.slice(0, 1000);

  // Replace <chat_history> placeholder with user message
  const prompt = settings.prompt.replace('<chat_history>', userInput);

  // Use specified model or default to Haiku
  const model = settings.model || DEFAULT_HAIKU_MODEL;

  try {
    const queryResult = sdkQuery({
      prompt,
      options: {
        model,
        maxTurns: 1,
        permissionMode: 'bypassPermissions',  // No tool use needed for title generation
      },
    });

    // Collect the result
    let result = '';
    for await (const msg of queryResult) {
      if (msg.type === 'result' && 'result' in msg) {
        result = msg.result;
      }
    }

    // Parse JSON response
    const title = parseTitleFromResponse(result);
    return title;
  } catch (error) {
    console.error('Title generation failed:', error);
    return null;
  }
}

/**
 * Sanitize title to prevent XSS (matches sanitizeName pattern in settings/route.ts)
 */
function sanitizeTitle(input: string): string {
  return input.replace(/[<>'"&]/g, '').trim();
}

/**
 * Parse title from Claude's JSON response.
 * Expected format: { "title": "..." }
 */
function parseTitleFromResponse(response: string): string | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*"title"[\s\S]*\}/);
    if (!jsonMatch) {
      // If no JSON found, use the response as-is (trimmed and sanitized)
      const sanitized = sanitizeTitle(response).slice(0, 50);
      return sanitized || null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.title === 'string' && parsed.title.trim()) {
      // Sanitize and limit title length
      return sanitizeTitle(parsed.title).slice(0, 100);
    }

    return null;
  } catch {
    // If JSON parsing fails, try to use the raw response (sanitized)
    const sanitized = sanitizeTitle(response).slice(0, 50);
    return sanitized || null;
  }
}
