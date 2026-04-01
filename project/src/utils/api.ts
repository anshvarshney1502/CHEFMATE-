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
    // Build prompt: system + last 8 turns + ChefMate: continuation
    const history = messages
      .slice(-8)
      .map(m => `${m.role === 'user' ? 'User' : 'ChefMate'}: ${m.content}`)
      .join('\n');

    const prompt = `${systemPrompt}\n\n${history}\nChefMate:`;

    const raw = await llmWorkerBridge.generate(prompt, 240, 0.65);

    const text = raw
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/[_`]/g, '')
      .replace(/^ChefMate:\s*/i, '')
      .trim() || 'Sorry, could not generate a recipe. Please try again!';

    // Simulate streaming: emit 4-char chunks with a tiny delay for smooth UX
    const chunks = text.match(/.{1,4}/g) ?? [text];
    for (const chunk of chunks) {
      onToken(chunk);
      await new Promise(r => setTimeout(r, 8));
    }

    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : 'On-device generation failed');
  }
}
