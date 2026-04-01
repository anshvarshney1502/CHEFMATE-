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
  /**
   * True once the model has successfully loaded at least once.
   * Background restarts are transparent — we skip App.tsx progress callbacks
   * so the UI never flips back to the LoadingScreen mid-conversation.
   */
  private initCompleted = false;
  /** Callbacks notified when a background restart finishes. */
  private readyListeners: Array<() => void> = [];
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
            // Skip UI updates during background restart — prevents App.tsx from
            // flipping back to LoadingScreen while the user is mid-conversation.
            if (this.initCompleted) break;
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
            if (!this.initCompleted) {
              // First successful load — tell App.tsx we're done.
              onProgress('done', 100, 'Ready!', data.modelName ?? '');
              this.initCompleted = true;
            }
            this.initPromise = null;
            resolve();
            // Unblock any generate() calls that were waiting for restart.
            this.readyListeners.splice(0).forEach(fn => fn());
            break;
          case 'error':
            if (!data.id) {
              // Init-phase error (no request id)
              this.initPromise = null;
              // Only reject the outer init promise if not yet successfully loaded.
              if (!this.initCompleted) reject(new Error(data.error));
            } else {
              this.pending.get(data.id)?.reject(new Error(data.error));
              this.pending.delete(data.id);
              // Worker signalled that its WASM state is stuck (generation timeout).
              // Restart to clear the stuck inference before the next query.
              if (data.needsRestart) this.scheduleRestart();
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
        // Only reject the init promise if model has never loaded (initial startup).
        // After first load, crashes are handled silently via scheduleRestart().
        if (!this.initCompleted) reject(err);
        this.scheduleRestart();
      };

      this.worker.postMessage({ type: 'init' });
    });
    return this.initPromise;
  }

  async generate(prompt: string, maxTokens = 300, temperature = 0.65): Promise<string> {
    // If the worker is restarting or re-initializing, wait up to 60s for it to
    // recover instead of immediately returning an error. This makes retries
    // seamless — the user just sees a loading state while the model reloads.
    const notReady = this.restarting || this.initPromise !== null || !this.worker;
    if (this.initCompleted && notReady) {
      await Promise.race([
        new Promise<void>(resolve => this.readyListeners.push(resolve)),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Model took too long to restart. Please refresh the page.')),
            60_000,
          )
        ),
      ]);
    }

    if (!this.worker) return Promise.reject(new Error('LLM worker not initialised'));

    const id = `${Date.now()}-${Math.random()}`;

    return new Promise<string>((resolve, reject) => {
      // Bridge-side safety timeout — restart worker if somehow stuck beyond worker timeout
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

  /** Terminate current worker and create a fresh one (model reloads from OPFS cache). */
  private scheduleRestart() {
    if (this.restarting) return;
    this.restarting = true;
    this.worker?.terminate();
    this.worker = null;
    this.initPromise = null;
    this.rejectAll(new Error('Model is reloading. Please retry in a moment.'));

    if (this.lastProgressCb) {
      // Small delay so UI can show the error before restart begins
      setTimeout(() => {
        this.restarting = false;
        this.lastProgress = {};
        this.lastPhase = '';
        // Re-init with the stored callback. Progress events are suppressed
        // (via initCompleted flag) so App.tsx stays on VoiceTab.
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
