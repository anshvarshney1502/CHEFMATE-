import { useState, useRef, useEffect, useCallback } from 'react';
import { ModelCategory, VideoCapture } from '@runanywhere/web';
import { VLMWorkerBridge } from '@runanywhere/web-llamacpp';
import { useModelLoader } from '../hooks/useModelLoader';
import { ModelBanner } from './ModelBanner';

const LIVE_INTERVAL_MS = 2500;
const LIVE_MAX_TOKENS = 30;
const SINGLE_MAX_TOKENS = 80;
const CAPTURE_DIM = 256;

interface VisionResult {
  text: string;
  totalMs: number;
}

const PROMPT_SUGGESTIONS = [
  'Describe what you see briefly.',
  'What food or ingredients do you see?',
  'Is this dish cooked properly?',
  'How fresh are these ingredients?',
];

export function VisionTab() {
  const loader = useModelLoader(ModelCategory.Multimodal);
  const [cameraActive, setCameraActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Describe what you see briefly.');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const videoMountRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<VideoCapture | null>(null);
  const processingRef = useRef(false);
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveModeRef = useRef(false);

  processingRef.current = processing;
  liveModeRef.current = liveMode;

  const startCamera = useCallback(async () => {
    if (captureRef.current?.isCapturing) return;
    setError(null);

    try {
      const cam = new VideoCapture({ facingMode: 'environment' });
      await cam.start();
      captureRef.current = cam;

      const mount = videoMountRef.current;
      if (mount) {
        const el = cam.videoElement;
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.objectFit = 'cover';
        el.style.borderRadius = '0';
        mount.appendChild(el);
      }

      setCameraActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setError('Camera permission denied. Check System Settings → Privacy & Security → Camera.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setError('No camera found on this device.');
      } else if (msg.includes('NotReadable') || msg.includes('TrackStartError')) {
        setError('Camera is in use by another application.');
      } else {
        setError(`Camera error: ${msg}`);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      const cam = captureRef.current;
      if (cam) {
        cam.stop();
        cam.videoElement.parentNode?.removeChild(cam.videoElement);
        captureRef.current = null;
      }
    };
  }, []);

  const describeFrame = useCallback(async (maxTokens: number) => {
    if (processingRef.current) return;
    const cam = captureRef.current;
    if (!cam?.isCapturing) return;

    if (loader.state !== 'ready') {
      const ok = await loader.ensure();
      if (!ok) return;
    }

    const frame = cam.captureFrame(CAPTURE_DIM);
    if (!frame) return;

    setProcessing(true);
    processingRef.current = true;
    setError(null);

    const t0 = performance.now();

    try {
      const bridge = VLMWorkerBridge.shared;
      if (!bridge.isModelLoaded) throw new Error('VLM model not loaded in worker');

      const res = await bridge.process(
        frame.rgbPixels, frame.width, frame.height,
        prompt, { maxTokens, temperature: 0.6 },
      );

      setResult({ text: res.text, totalMs: performance.now() - t0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isWasmCrash = msg.includes('memory access out of bounds') || msg.includes('RuntimeError');
      if (isWasmCrash) {
        setResult({ text: 'Recovering from memory error… next frame will retry.', totalMs: 0 });
      } else {
        setError(msg);
        if (liveModeRef.current) stopLive();
      }
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  }, [loader, prompt]);

  const describeSingle = useCallback(async () => {
    if (!captureRef.current?.isCapturing) { await startCamera(); return; }
    await describeFrame(SINGLE_MAX_TOKENS);
  }, [startCamera, describeFrame]);

  const startLive = useCallback(async () => {
    if (!captureRef.current?.isCapturing) await startCamera();
    setLiveMode(true);
    liveModeRef.current = true;
    describeFrame(LIVE_MAX_TOKENS);
    liveIntervalRef.current = setInterval(() => {
      if (!processingRef.current && liveModeRef.current) describeFrame(LIVE_MAX_TOKENS);
    }, LIVE_INTERVAL_MS);
  }, [startCamera, describeFrame]);

  const stopLive = useCallback(() => {
    setLiveMode(false);
    liveModeRef.current = false;
    if (liveIntervalRef.current) { clearInterval(liveIntervalRef.current); liveIntervalRef.current = null; }
  }, []);

  const toggleLive = useCallback(() => {
    liveMode ? stopLive() : startLive();
  }, [liveMode, startLive, stopLive]);

  return (
    <div className="tab-panel vision-panel">
      <style>{`
        .vision-panel { display: flex; flex-direction: column; }
        .vision-camera-wrap {
          border-radius: 18px;
          background: #0F0F1C;
          border: 1px solid rgba(255,255,255,0.07);
          overflow: hidden;
          position: relative;
          aspect-ratio: 4/3;
          min-height: 200px;
          flex-shrink: 0;
        }
        .camera-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #5C5C8A;
        }
        .camera-icon {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(255,107,53,0.08);
          border: 1px solid rgba(255,107,53,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }
        .prompt-row {
          display: flex;
          gap: 8px;
          align-items: center;
          position: relative;
        }
        .prompt-suggestions {
          position: absolute;
          top: calc(100% + 6px);
          left: 0; right: 0;
          background: #0F0F1C;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          overflow: hidden;
          z-index: 50;
          box-shadow: 0 16px 40px rgba(0,0,0,0.5);
          animation: fadeUp 0.2s ease;
        }
        .prompt-suggestion-item {
          padding: 10px 14px;
          font-size: 13px;
          color: #9898BE;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Outfit', sans-serif;
        }
        .prompt-suggestion-item:hover {
          background: rgba(255,107,53,0.08);
          color: #FF9060;
        }
        .vision-actions-row {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
        .vis-btn {
          flex: 1;
          max-width: 180px;
          padding: 11px 20px;
          border-radius: 12px;
          border: none;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }
        .vis-btn-primary {
          background: linear-gradient(135deg, #FF6B35, #FF9060);
          color: white;
          box-shadow: 0 4px 16px rgba(255,107,53,0.35);
        }
        .vis-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(255,107,53,0.5); }
        .vis-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .vis-btn-sec {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #9898BE;
        }
        .vis-btn-sec:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #F2F2FF; }
        .vis-btn-sec:disabled { opacity: 0.5; cursor: not-allowed; }
        .vis-btn-live {
          background: linear-gradient(135deg, #FF4F6D, #FF7092);
          border: none;
          color: white;
          box-shadow: 0 4px 16px rgba(255,79,109,0.4);
          animation: liveGlow 1.8s ease-in-out infinite;
        }
        @keyframes liveGlow {
          0%, 100% { box-shadow: 0 4px 16px rgba(255,79,109,0.4); }
          50% { box-shadow: 0 4px 28px rgba(255,79,109,0.7); }
        }
        .result-card {
          background: #0F0F1C;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 16px;
          animation: fadeUp 0.3s ease;
        }
        .result-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .result-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #5C5C8A;
        }
        .result-time {
          margin-left: auto;
          font-size: 11px;
          color: #FF9060;
          font-weight: 600;
          font-family: monospace;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .processing-overlay {
          position: absolute;
          inset: 0;
          background: rgba(7,7,15,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
        }
        .processing-spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(255,107,53,0.15);
          border-top-color: #FF6B35;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <ModelBanner
        state={loader.state}
        progress={loader.progress}
        error={loader.error}
        onLoad={loader.ensure}
        label="VLM"
      />

      {/* Camera */}
      <div className="vision-camera-wrap">
        {!cameraActive && (
          <div className="camera-placeholder">
            <div className="camera-icon">📷</div>
            <p style={{ fontSize: 14, fontWeight: 500 }}>Camera Preview</p>
            <p style={{ fontSize: 12, textAlign: 'center', lineHeight: 1.5, maxWidth: 200 }}>
              Tap "Start Camera" to begin analyzing food & ingredients
            </p>
          </div>
        )}
        {processing && cameraActive && (
          <div className="processing-overlay">
            <div className="processing-spinner" />
          </div>
        )}
        <div ref={videoMountRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Prompt input */}
      <div className="prompt-row">
        <input
          className="vision-prompt"
          type="text"
          placeholder="What do you want to know about the image?"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          disabled={liveMode}
        />
        {showSuggestions && !liveMode && (
          <div className="prompt-suggestions">
            {PROMPT_SUGGESTIONS.map((s) => (
              <div
                key={s}
                className="prompt-suggestion-item"
                onMouseDown={() => { setPrompt(s); setShowSuggestions(false); }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="vision-actions-row">
        {!cameraActive ? (
          <button className="vis-btn vis-btn-primary" onClick={startCamera}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Start Camera
          </button>
        ) : (
          <>
            <button
              className="vis-btn vis-btn-primary"
              onClick={describeSingle}
              disabled={processing || liveMode}
              style={{ maxWidth: 200 }}
            >
              {processing && !liveMode ? (
                <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Analyzing…</>
              ) : (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Describe</>
              )}
            </button>
            <button
              className={`vis-btn ${liveMode ? 'vis-btn-live' : 'vis-btn-sec'}`}
              onClick={toggleLive}
              disabled={processing && !liveMode}
            >
              {liveMode ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg> Stop Live</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Live</>
              )}
            </button>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,79,109,0.08)', border: '1px solid rgba(255,79,109,0.22)', borderRadius: 12, fontSize: 13, color: '#FF4F6D', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <svg style={{ flexShrink: 0, marginTop: 1 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#FF4F6D', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="result-card">
          <div className="result-header">
            {liveMode && (
              <span className="live-badge">
                LIVE
              </span>
            )}
            <span className="result-label">Analysis Result</span>
            {result.totalMs > 0 && (
              <span className="result-time">{(result.totalMs / 1000).toFixed(1)}s</span>
            )}
          </div>
          <p style={{ fontSize: 14, color: '#F2F2FF', lineHeight: 1.65, margin: 0 }}>{result.text}</p>
        </div>
      )}
    </div>
  );
}
