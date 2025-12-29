import type { TitleGenerationSettings } from '@/types';

// Default prompt template for title generation
export const DEFAULT_TITLE_PROMPT = `### Task:
Generate a concise, 3-5 word title with an emoji summarizing the user's message.
### Guidelines:
- The title should clearly represent the main theme or subject of the message.
- Use emojis that enhance understanding of the topic, but avoid quotation marks or special formatting.
- Write the title in the message's primary language; default to Japanese if multilingual.
- Prioritize accuracy over excessive creativity; keep it clear and simple.
### Output:
JSON format: { "title": "your concise title here" }
### Examples:
- { "title": "📉 株式市場の動向" },
- { "title": "🍪 完璧なチョコチップレシピ" },
- { "title": "🎵 音楽ストリーミングの進化" },
- { "title": "🏠 リモートワークの生産性向上" },
- { "title": "🏥 医療における人工知能" },
- { "title": "🎮 ビデオゲーム開発の洞察" }
### User Message:
<chat_history>`;

// Default title generation settings
export const DEFAULT_TITLE_GENERATION: TitleGenerationSettings = {
  enabled: true,
  model: '',  // Empty = use first Haiku model from SDK
  prompt: DEFAULT_TITLE_PROMPT,
};
