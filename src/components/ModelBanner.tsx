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
      padding: '11px 18px',
      background: 'rgba(10,19,16,0.96)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(52,211,153,0.1)',
      flexWrap: 'wrap',
      fontSize: 13,
      fontFamily: 'var(--font-body)',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>

      {state === 'idle' && (
        <>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>
              {label} model not loaded
            </p>
            <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Download once · runs 100% on your device
            </p>
          </div>
          <button
            onClick={onLoad}
            style={{
              padding: '7px 18px',
              background: 'linear-gradient(135deg, #34D399, #059669)',
              border: 'none',
              borderRadius: 10,
              color: '#060A07',
              fontFamily: 'var(--font-body)',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(52,211,153,0.3)',
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
            <span style={{ color: 'var(--text-sub)', fontWeight: 500 }}>Downloading {label}…</span>
            <span style={{ color: 'var(--primary)', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              {pct}%
            </span>
          </div>
          <div style={{
            height: 5,
            background: 'rgba(52,211,153,0.06)',
            borderRadius: 999,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #059669, #34D399)',
              borderRadius: 999,
              transition: 'width 0.4s ease',
              boxShadow: '0 0 10px rgba(52,211,153,0.4)',
            }} />
          </div>
        </div>
      )}

      {state === 'loading' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 16,
            height: 16,
            border: '2px solid rgba(52,211,153,0.15)',
            borderTopColor: '#34D399',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }} />
          <span style={{ color: 'var(--text-sub)', fontSize: 13 }}>Loading {label} into engine…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {state === 'error' && (
        <>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--red)', fontSize: 13 }}>Load failed</p>
            <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {error}
            </p>
          </div>
          <button
            onClick={onLoad}
            style={{
              padding: '7px 16px',
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.22)',
              borderRadius: 10,
              color: 'var(--red)',
              fontFamily: 'var(--font-body)',
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
