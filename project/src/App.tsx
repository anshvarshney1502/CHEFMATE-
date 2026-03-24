import { useState, useEffect } from 'react';
import { llmWorkerBridge } from './utils/llmWorkerBridge';
import { VoiceTab } from './components/VoiceTab';

interface LoadState {
  phase: 'sdk' | 'download' | 'validate' | 'load' | 'done' | 'error';
  progress: number;
  modelName: string;
  error: string;
}

const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: #060A07; font-family: 'Plus Jakarta Sans', sans-serif; color: #ECFDF5; }
  @keyframes float  { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-14px) rotate(2deg)} }
  @keyframes glow   { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:1;transform:scale(1.18)} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes dot    { 0%,100%{transform:translateY(0);opacity:.3} 50%{transform:translateY(-7px);opacity:1} }
  @keyframes ring   { 0%{transform:scale(0.8);opacity:0.6} 100%{transform:scale(2);opacity:0} }
`;

function LoadingScreen({ ls }: { ls: LoadState }) {
  const pct = Math.round(ls.progress);
  const phaseLabel =
    ls.phase === 'sdk'      ? 'Starting engine…'            :
    ls.phase === 'download' ? `Downloading model… ${pct}%`  :
    ls.phase === 'validate' ? `Verifying model… ${pct}%`    :
    ls.phase === 'load'     ? 'Loading into memory…'         : 'Almost ready!';

  const isComplete = pct >= 100;

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% -5%, rgba(52,211,153,0.12) 0%, transparent 55%), #060A07',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{BASE_CSS}</style>

      {/* Ambient orbs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '20%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(52,211,153,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-8%', right: '18%',
        width: 380, height: 380, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 28, padding: '52px 36px', zIndex: 1, textAlign: 'center',
        animation: 'fadeUp 0.6s ease both',
      }}>
        {/* Chef with pulse rings */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Pulse rings */}
          {[1, 2].map(i => (
            <div key={i} style={{
              position: 'absolute',
              width: 100 + i * 24,
              height: 100 + i * 24,
              borderRadius: '50%',
              border: '1px solid rgba(52,211,153,0.18)',
              animation: `ring 2.5s ease-out ${i * 0.8}s infinite`,
              pointerEvents: 'none',
            }} />
          ))}
          <div style={{
            position: 'absolute', inset: -28,
            background: 'radial-gradient(circle, rgba(52,211,153,0.18) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'glow 3s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{
            fontSize: 80,
            animation: 'float 4s ease-in-out infinite',
            display: 'inline-block',
            filter: 'drop-shadow(0 16px 40px rgba(52,211,153,0.35))',
          }}>
            👨‍🍳
          </div>
        </div>

        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 42,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #ECFDF5 30%, #6EE7B7 80%, #34D399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}>
            ChefMate
          </h1>
          <p style={{
            fontSize: 10, color: '#2D4A3A', fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            On-Device AI Kitchen Companion
          </p>
        </div>

        {/* Progress section */}
        <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          {/* Track */}
          <div style={{
            width: '100%', height: 5,
            background: 'rgba(52,211,153,0.08)',
            borderRadius: 999, overflow: 'hidden',
            border: '1px solid rgba(52,211,153,0.06)',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.max(3, pct)}%`,
              background: isComplete
                ? 'linear-gradient(90deg, #10B981, #34D399)'
                : 'linear-gradient(90deg, #059669, #34D399, #6EE7B7)',
              borderRadius: 999,
              boxShadow: isComplete
                ? '0 0 12px rgba(16,185,129,0.5)'
                : '0 0 14px rgba(52,211,153,0.45)',
              transition: 'width 0.4s ease, background 0.4s',
            }} />
          </div>

          {/* Label */}
          <p style={{ fontSize: 12, color: '#6EE7B7', fontWeight: 500 }}>
            {phaseLabel}
          </p>

          {ls.modelName && (
            <p style={{
              fontSize: 10, color: '#2D4A3A',
              fontFamily: "'JetBrains Mono', monospace",
              maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {ls.modelName}
            </p>
          )}
        </div>

        {/* Animated dots */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 0.18, 0.36].map((d, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#34D399',
              animation: `dot 1.4s ease-in-out ${d}s infinite`,
              boxShadow: '0 0 8px rgba(52,211,153,0.55)',
            }} />
          ))}
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['🔒 100% Private', '✈️ Works Offline', '⚡ Zero Latency'].map(l => (
            <span key={l} style={{
              fontSize: 10, fontWeight: 600,
              padding: '4px 12px', borderRadius: 999,
              background: 'rgba(52,211,153,0.06)',
              border: '1px solid rgba(52,211,153,0.12)',
              color: '#2D4A3A',
              letterSpacing: '0.04em',
            }}>
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#060A07', fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <style>{BASE_CSS}</style>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 18, padding: '44px 36px',
        background: 'rgba(248,113,113,0.04)',
        border: '1px solid rgba(248,113,113,0.18)',
        borderRadius: 24, maxWidth: 420, textAlign: 'center',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        animation: 'fadeUp 0.5s ease both',
      }}>
        <div style={{ fontSize: 52 }}>⚠️</div>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 26, fontWeight: 600, color: '#ECFDF5',
        }}>
          Initialisation Failed
        </h2>
        <p style={{ fontSize: 13, color: '#6EE7B7', lineHeight: 1.7, opacity: 0.8 }}>
          {error}
        </p>
        <button
          onClick={onRetry}
          style={{
            padding: '11px 32px',
            background: 'linear-gradient(135deg, #34D399, #059669)',
            border: 'none', borderRadius: 999,
            color: '#060A07', fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(52,211,153,0.4)',
          }}
        >
          Try Again
        </button>
        <p style={{ fontSize: 11, color: '#2D4A3A', lineHeight: 1.8 }}>
          Use Chrome or Edge with WebGPU / WASM support.
        </p>
      </div>
    </div>
  );
}

export function App() {
  const [ls, setLs] = useState<LoadState>({ phase: 'sdk', progress: 0, modelName: '', error: '' });

  const load = async () => {
    setLs({ phase: 'sdk', progress: 0, modelName: '', error: '' });
    try {
      await llmWorkerBridge.init((phase, progress, _label, modelName) => {
        setLs(s => ({
          ...s,
          phase: phase as LoadState['phase'],
          progress,
          modelName: modelName || s.modelName,
        }));
      });
      setLs(s => ({ ...s, phase: 'done', progress: 100 }));
    } catch (e: any) {
      setLs(s => ({ ...s, phase: 'error', error: e?.message ?? String(e) }));
    }
  };

  useEffect(() => { load(); }, []);

  if (ls.phase === 'error') return <ErrorScreen error={ls.error} onRetry={load} />;
  if (ls.phase !== 'done')  return <LoadingScreen ls={ls} />;
  return <VoiceTab />;
}
