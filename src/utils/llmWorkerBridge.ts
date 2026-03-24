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
  private lastProgressCb: LLMProgressCb | null = null;
  private restarting = false;
  /** Held while the init promise is still pending — prevents double-init. */
  private initPromise: Promise<void> | null = null;

  init(onProgress: LLMProgressCb): Promise<void> {
    this.lastProgressCb = onProgress;
    // Reuse existing worker if already initialised
    if (this.worker) return Promise.resolve();
    // Return the in-flight promise if init is already in progress
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      this.worker = new LLMWorkerFactory() as Worker;

      this.worker.onmessage = ({ data }: MessageEvent) => {
        switch (data.type) {
          case 'progress': {
            const prev    = this.lastProgress[data.phase] ?? 0;
            const clamped = data.phase === this.lastPhase
              ? Math.max(prev, data.progress as number)
              : (data.progress as number);
            this.lastPhase                = data.phase;
            this.lastProgress[data.phase] = clamped;
            onProgress(data.phase, clamped, data.label, data.modelName ?? '');
            break;
          }
          case 'ready':
            onProgress('done', 100, 'Ready!', data.modelName ?? '');
            this.initPromise = null;
            resolve();
            break;
          case 'error':
            if (!data.id) {
              this.initPromise = null;
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
        this.initPromise = null;
        this.rejectAll(err);
        reject(err);
        // Auto-restart worker after crash
        this.scheduleRestart();
      };

      this.worker.postMessage({ type: 'init' });
    });
    return this.initPromise;
  }

  generate(prompt: string, maxTokens = 300, temperature = 0.65): Promise<string> {
    if (!this.worker) return Promise.reject(new Error('LLM worker not initialised'));
    if (this.restarting) return Promise.reject(new Error('Model is restarting, please try again in a moment.'));

    const id = `${Date.now()}-${Math.random()}`;

    return new Promise<string>((resolve, reject) => {
      // Bridge-side safety timeout — restart worker if stuck
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('Generation timed out. Model will restart automatically.'));
          this.scheduleRestart();
        }
      }, 90_000);

      this.pending.set(id, {
        resolve: (t) => { clearTimeout(timer); resolve(t); },
        reject:  (e) => { clearTimeout(timer); reject(e); },
      });
      this.worker!.postMessage({ type: 'generate', id, prompt, maxTokens, temperature });
    });
  }

  /** Terminate current worker and create a fresh one (model reloads from cache). */
  private scheduleRestart() {
    if (this.restarting) return;
    this.restarting = true;
    this.worker?.terminate();
    this.worker = null;
    this.initPromise = null;
    this.rejectAll(new Error('Model restarting…'));

    if (this.lastProgressCb) {
      // Small delay so UI can show the error before restart begins
      setTimeout(() => {
        this.restarting = false;
        this.lastProgress = {};
        this.lastPhase = '';
        this.init(this.lastProgressCb!).catch(() => {});
      }, 1500);
    } else {
      this.restarting = false;
    }
  }

  /** Reject all in-flight requests. */
  private rejectAll(err: Error) {
    for (const [, p] of this.pending) p.reject(err);
    this.pending.clear();
  }
}

export const llmWorkerBridge = new LLMWorkerBridge();
