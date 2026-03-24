import type { LoaderState } from '../hooks/useModelLoader';

interface Props {
  state: LoaderState;
  progress: number;
  error: string | null;
  onLoad: () => void;
  label: string;
}

const MODEL_ICONS: Record<string, string> = {
  LLM: '🧠',
  VLM: '👁️',
  STT: '🎙️',
  TTS: '🔊',
  VAD: '👂',
};

export function ModelBanner({ state, progress, error, onLoad, label }: Props) {
  if (state === 'ready') return null;

  const icon = MODEL_ICONS[label] ?? '📦';
  const pct = Math.round(progress * 100);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 18px',
      background: 'linear-gradient(135deg, rgba(15,15,28,0.95), rgba(22,22,42,0.95))',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      flexWrap: 'wrap',
      fontSize: 13,
      fontFamily: "'Outfit', sans-serif",
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>

      {state === 'idle' && (
        <>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#F2F2FF', fontSize: 13 }}>
              {label} model not loaded
            </p>
            <p style={{ margin: 0, fontSize: 11.5, color: '#5C5C8A', marginTop: 2 }}>
              Download once, runs 100% on your device
            </p>
          </div>
          <button
            onClick={onLoad}
            style={{
              padding: '7px 18px',
              background: 'linear-gradient(135deg, #FF6B35, #FF9060)',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(255,107,53,0.35)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Download &amp; Load
          </button>
        </>
      )}

      {state === 'downloading' && (
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#9898BE', fontWeight: 500 }}>Downloading {label}…</span>
            <span style={{ color: '#FF9060', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
              {pct}%
            </span>
          </div>
          <div style={{
            height: 6,
            background: 'rgba(255,255,255,0.07)',
            borderRadius: 999,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #FF6B35, #FF9060)',
              borderRadius: 999,
              transition: 'width 0.4s ease',
              boxShadow: '0 0 10px rgba(255,107,53,0.5)',
            }} />
          </div>
        </div>
      )}

      {state === 'loading' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 18,
            height: 18,
            border: '2.5px solid rgba(255,107,53,0.2)',
            borderTopColor: '#FF6B35',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }} />
          <span style={{ color: '#9898BE' }}>Loading {label} into engine…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {state === 'error' && (
        <>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#FF4F6D', fontSize: 13 }}>Load failed</p>
            <p style={{ margin: 0, fontSize: 11.5, color: '#5C5C8A', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {error}
            </p>
          </div>
          <button
            onClick={onLoad}
            style={{
              padding: '7px 16px',
              background: 'rgba(255,79,109,0.1)',
              border: '1px solid rgba(255,79,109,0.3)',
              borderRadius: 10,
              color: '#FF4F6D',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Retry
          </button>
        </>
      )}
    </div>
  );
}
