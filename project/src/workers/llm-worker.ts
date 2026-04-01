/**
 * LLM Web Worker entry point.
 *
 * Runs the full RunAnywhere SDK + LFM2 model lifecycle off the main thread
 * so UI and voice stay responsive during inference.
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

// ── Model catalog (LLM only) ──────────────────────────────────────────────
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

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  // ── Init: SDK → download → load ────────────────────────────────────────
  if (msg.type === 'init') {
    try {
      post({ type: 'progress', phase: 'sdk', progress: 0, label: 'Starting engine…' });

      await RunAnywhere.initialize({ environment: SDKEnvironment.Development, debug: false });
      await LlamaCPP.register();
      RunAnywhere.registerModels(MODELS);

      const llm = ModelManager.getModels().find(m => m.modality === ModelCategory.Language);
      if (!llm) throw new Error('No language model registered.');

      const name = llm.name ?? llm.id;
      post({ type: 'progress', phase: 'download', progress: 0, label: 'Downloading model…', modelName: name });

      const needsDownload = llm.status !== 'downloaded' && llm.status !== 'loaded';
      if (needsDownload) {
        let lastPct = 0;
        const unsub = EventBus.shared.on('model.downloadProgress', (evt: any) => {
          if (evt.modelId !== llm.id) return;
          const pct  = Math.round((evt.progress ?? 0) * 100);
          const phase = evt.stage === 'validating' ? 'validate' : 'download';
          const label = phase === 'validate'
            ? `Verifying model… ${pct}%`
            : `Downloading model… ${pct}%`;
          // Clamp — never go backward
          const clamped = Math.max(lastPct, pct);
          lastPct = clamped;
          post({ type: 'progress', phase, progress: clamped, label, modelName: name });
        });
        await ModelManager.downloadModel(llm.id);
        unsub();
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

  // ── Generate ────────────────────────────────────────────────────────────
  if (msg.type === 'generate') {
    try {
      const result = await TextGeneration.generate(msg.prompt as string, {
        maxTokens:   msg.maxTokens   ?? 240,
        temperature: msg.temperature ?? 0.65,
      });
      post({ type: 'done', id: msg.id, text: result.text?.trim() ?? '' });
    } catch (err: any) {
      post({ type: 'error', id: msg.id, error: err?.message ?? String(err) });
    }
  }
};
