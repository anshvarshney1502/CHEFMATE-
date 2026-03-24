/**
 * LLM Web Worker entry point.
 *
 * Runs the full RunAnywhere SDK + LFM2 model lifecycle off the main thread
 * so UI and voice stay responsive during inference.
 *
 * Key offline behaviour:
 *   - Model files are cached in OPFS after first download.
 *   - On subsequent loads (even offline), we refresh OPFS status first,
 *     skip the network download if model is already cached, and load from disk.
 *   - TextGeneration.generate() runs entirely in WASM — no network at all.
 *
 * Messages in  → { type:'init' }
 *                { type:'generate', id, prompt, maxTokens?, temperature? }
 *
 * Messages out → { type:'progress', phase, progress, label, modelName? }
 *                { type:'ready', modelName }
 *                { type:'done', id, text }
 *                { type:'error', id?, error }
 */

import {
  RunAnywhere, SDKEnvironment, ModelManager, ModelCategory,
  EventBus, LLMFramework,
} from '@runanywhere/web';
import type { CompactModelDef } from '@runanywhere/web';
import { LlamaCPP, TextGeneration } from '@runanywhere/web-llamacpp';

// ── Model catalog ─────────────────────────────────────────────────────────
const MODELS: CompactModelDef[] = [
  {
    id: 'lfm2-1.2b-tool-q4_k_m',
    name: 'LFM2 1.2B Tool Q4_K_M',
    repo: 'LiquidAI/LFM2-1.2B-Tool-GGUF',
    files: ['LFM2-1.2B-Tool-Q4_K_M.gguf'],
    framework: LLMFramework.LlamaCpp,
    modality: ModelCategory.Language,
    memoryRequirement: 800_000_000,
  },
  {
    id: 'lfm2-350m-q4_k_m',
    name: 'LFM2 350M Q4_K_M',
    repo: 'LiquidAI/LFM2-350M-GGUF',
    files: ['LFM2-350M-Q4_K_M.gguf'],
    framework: LLMFramework.LlamaCpp,
    modality: ModelCategory.Language,
    memoryRequirement: 250_000_000,
  },
];

function post(msg: object) { (self as any).postMessage(msg); }

// ── Generation lock: only one WASM inference at a time ────────────────────
let isGenerating = false;

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  // ── Init: SDK → check OPFS cache → download if needed → load ───────────
  if (msg.type === 'init') {
    try {
      post({ type: 'progress', phase: 'sdk', progress: 0, label: 'Starting engine…' });

      await RunAnywhere.initialize({ environment: SDKEnvironment.Development, debug: false });
      await LlamaCPP.register();
      RunAnywhere.registerModels(MODELS);

      // registerModels() fires refreshDownloadStatus() but does NOT await it.
      // We must await explicitly so llm.status correctly reflects OPFS cache state.
      // Without this, the status is always 'registered' → we try to re-download
      // even when the model is already cached locally.
      await (ModelManager as any).refreshDownloadStatus();

      const llm = ModelManager.getModels().find(m => m.modality === ModelCategory.Language);
      if (!llm) throw new Error('No language model registered.');

      const name = llm.name ?? llm.id;

      // 'downloaded' or 'loaded' means it's already in OPFS — skip download entirely
      const needsDownload = llm.status !== 'downloaded' && llm.status !== 'loaded';

      if (needsDownload) {
        // Check connectivity before attempting network download
        const isOnline = typeof (self as any).navigator !== 'undefined'
          ? (self as any).navigator.onLine
          : true;

        if (!isOnline) {
          throw new Error(
            'Model not yet downloaded and device is offline.\n' +
            'Please connect to the internet once to download the model (~800 MB), ' +
            'then it will work fully offline forever.'
          );
        }

        post({ type: 'progress', phase: 'download', progress: 0, label: 'Downloading model…', modelName: name });

        let lastPct = 0;
        const unsub = EventBus.shared.on('model.downloadProgress', (evt: any) => {
          if (evt.modelId !== llm.id) return;
          const pct   = Math.round((evt.progress ?? 0) * 100);
          const phase = evt.stage === 'validating' ? 'validate' : 'download';
          const label = phase === 'validate'
            ? `Verifying model… ${pct}%`
            : `Downloading model… ${pct}%`;
          const clamped = Math.max(lastPct, pct);
          lastPct = clamped;
          post({ type: 'progress', phase, progress: clamped, label, modelName: name });
        });

        await ModelManager.downloadModel(llm.id);
        unsub();
      } else {
        post({ type: 'progress', phase: 'download', progress: 100, label: 'Model cached ✓', modelName: name });
      }

      post({ type: 'progress', phase: 'load', progress: 97, label: 'Loading into memory…', modelName: name });

      const ok = await Promise.race<boolean>([
        ModelManager.loadModel(llm.id, { coexist: false }),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Model load timed out — check RAM / WebAssembly support.')), 180_000)
        ),
      ]);
      if (!ok) throw new Error('loadModel() returned false — not enough memory.');

      post({ type: 'ready', modelName: name });

    } catch (err: any) {
      post({ type: 'error', error: err?.message ?? String(err) });
    }
  }

  // ── Generate ─────────────────────────────────────────────────────────────
  // TextGeneration.generate() runs entirely in WASM — no internet needed.
  if (msg.type === 'generate') {
    if (isGenerating) {
      post({
        type: 'error', id: msg.id,
        error: 'Model is busy. Please wait a moment and try again.',
      });
      return;
    }

    isGenerating = true;
    try {
      const result = await Promise.race([
        TextGeneration.generate(msg.prompt as string, {
          maxTokens:   msg.maxTokens   ?? 300,
          temperature: msg.temperature ?? 0.5,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Generation is taking too long. Please try again.')), 60_000)
        ),
      ]);
      post({ type: 'done', id: msg.id, text: result.text?.trim() ?? '' });
    } catch (err: any) {
      post({ type: 'error', id: msg.id, error: err?.message ?? String(err) });
    } finally {
      isGenerating = false;
    }
  }
};
