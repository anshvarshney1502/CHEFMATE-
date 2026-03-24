/**
 * On-device LLM inference via the LLM Web Worker.
 * Inference runs off the main thread — UI stays responsive.
 */
import { llmWorkerBridge } from './llmWorkerBridge';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function generateLocally(
  messages: ChatMessage[],
  systemPrompt: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): Promise<void> {
  try {
    // Last 2 turns to stay within small model context window
    const recent = messages.slice(-4);
    const history = recent
      .map(m => `${m.role === 'user' ? 'User' : 'ChefMate'}: ${m.content}`)
      .join('\n');

    // For recipe-like queries, append a format reminder so the small model
    // is more likely to produce the structured Ingredients+Steps format.
    const lastUser = recent.filter(m => m.role === 'user').pop()?.content ?? '';
    const isRecipeQuery = /\b(recipe|how to make|how to cook|prepare|dish|cook|make|bake|fry)\b/i.test(lastUser);
    const formatHint = isRecipeQuery
      ? '\n(Write Ingredients: list, then Steps: 1. 2. 3. 4. 5.)'
      : '';

    const prompt = `${systemPrompt}\n\n${history}${formatHint}\nChefMate:`;

    const raw = await llmWorkerBridge.generate(prompt, 450, 0.5);

    const text = raw
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/[_`]/g, '')
      .replace(/^ChefMate:\s*/i, '')
      .trim() || 'Could not generate a recipe. Please try again!';

    // Stream chunks for smooth UX
    const chunks = text.match(/.{1,4}/g) ?? [text];
    for (const chunk of chunks) {
      onToken(chunk);
      await new Promise(r => setTimeout(r, 8));
    }

    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : 'On-device generation failed. Please try again.');
  }
}
