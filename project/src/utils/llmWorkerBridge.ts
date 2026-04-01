/**
 * Main-thread bridge to the LLM Web Worker.
 *
 * Usage:
 *   await llmWorkerBridge.init(onProgress);   // call once at startup
 *   const text = await llmWorkerBridge.generate(prompt);
 */

// @ts-ignore — Vite ?worker import
import LLMWorkerFactory from '../workers/llm-worker?worker';

export type LLMProgressCb = (
  phase: string,
  progress: number,
  label: string,
  modelName: string,
) => void;

type Pending = { resolve: (t: string) => void; reject: (e: Error) => void };

class LLMWorkerBridge {
  private worker: Worker | null = null;
  private pending = new Map<string, Pending>();
  private lastProgress: Record<string, number> = {};
  private lastPhase = '';

  init(onProgress: LLMProgressCb): Promise<void> {
    // Reuse existing worker if already initialised
    if (this.worker) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.worker = new LLMWorkerFactory() as Worker;

      this.worker.onmessage = ({ data }: MessageEvent) => {
        switch (data.type) {
          case 'progress': {
            // Clamp: never let progress go backward within the same phase
            const prev    = this.lastProgress[data.phase] ?? 0;
            const clamped = data.phase === this.lastPhase
              ? Math.max(prev, data.progress as number)
              : (data.progress as number);
            this.lastPhase              = data.phase;
            this.lastProgress[data.phase] = clamped;
            onProgress(data.phase, clamped, data.label, data.modelName ?? '');
            break;
          }
          case 'ready':
            onProgress('done', 100, 'Ready!', data.modelName ?? '');
            resolve();
            break;
          case 'error':
            if (!data.id) {
              reject(new Error(data.error));
            } else {
              this.pending.get(data.id)?.reject(new Error(data.error));
              this.pending.delete(data.id);
            }
            break;
          case 'done':
            this.pending.get(data.id)?.resolve(data.text as string);
            this.pending.delete(data.id);
            break;
        }
      };

      this.worker.onerror = (e) => {
        const err = new Error(e.message ?? 'LLM worker crashed');
        this.rejectAll(err);   // unblock any in-flight generate() calls
        reject(err);           // fail the init promise if still pending
      };

      this.worker.postMessage({ type: 'init' });
    });
  }

  generate(prompt: string, maxTokens = 240, temperature = 0.65): Promise<string> {
    if (!this.worker) return Promise.reject(new Error('LLM worker not initialised'));
    const id = `${Date.now()}-${Math.random()}`;

    // Safety timeout — if the worker never responds, reject after 90s
    // so isSending never gets permanently stuck.
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('Generation timed out. Please try again.'));
        }
      }, 90_000);

      this.pending.set(id, {
        resolve: (t) => { clearTimeout(timer); resolve(t); },
        reject:  (e) => { clearTimeout(timer); reject(e); },
      });
      this.worker!.postMessage({ type: 'generate', id, prompt, maxTokens, temperature });
    });
  }

  /** Reject all in-flight requests — called when worker crashes. */
  private rejectAll(err: Error) {
    for (const [, p] of this.pending) p.reject(err);
    this.pending.clear();
  }
}

export const llmWorkerBridge = new LLMWorkerBridge();
