import { X } from 'lucide-react';
import type { SpeechState } from '../hooks/useVoice';
import type { ParsedRecipe } from '../utils/parseRecipe';
import type { TimerState } from '../hooks/useTimer';

interface VoiceModalProps {
  state:        SpeechState;
  transcript:   string;
  response:     string;
  parsedRecipe: ParsedRecipe | null;
  timer:        TimerState;
  onStopTimer:  () => void;
  onStop:       () => void;
  onClose:      () => void;
}

const STATE_LABELS: Record<SpeechState, string> = {
  idle:       'Ready to Listen',
  listening:  'Listening…',
  processing: 'Thinking…',
  speaking:   'Speaking…',
};

const STATE_ICONS: Record<SpeechState, string> = {
  idle:       '🎧',
  listening:  '🎙',
  processing: '⚙️',
  speaking:   '🔊',
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function fmtTime(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }

function ingredientEmoji(text: string): string {
  const t = text.toLowerCase();
  if (/pasta|noodle|spaghetti/.test(t)) return '🍝';
  if (/rice|biryani/.test(t))           return '🍚';
  if (/bread|roti|naan/.test(t))        return '🫓';
  if (/egg/.test(t))                    return '🥚';
  if (/milk|cream/.test(t))             return '🥛';
  if (/butter|ghee/.test(t))            return '🧈';
  if (/cheese|paneer/.test(t))          return '🧀';
  if (/chicken/.test(t))                return '🍗';
  if (/beef|mutton|lamb/.test(t))       return '🥩';
  if (/fish|salmon|tuna|shrimp/.test(t))return '🐟';
  if (/tomato/.test(t))                 return '🍅';
  if (/garlic/.test(t))                 return '🧄';
  if (/onion/.test(t))                  return '🧅';
  if (/potato|aloo/.test(t))            return '🥔';
  if (/carrot/.test(t))                 return '🥕';
  if (/oil/.test(t))                    return '🫒';
  if (/salt|pepper|spice|masala|haldi|turmeric|cumin|jeera/.test(t)) return '🧂';
  if (/sugar|honey/.test(t))            return '🍯';
  if (/water|broth/.test(t))            return '💧';
  if (/sauce|chutney/.test(t))          return '🫙';
  if (/tea|chai/.test(t))               return '🍵';
  if (/lemon|lime|nimbu/.test(t))       return '🍋';
  if (/dal|lentil/.test(t))             return '🫘';
  return '🌿';
}

export function VoiceModal({
  state, transcript, parsedRecipe, timer, onStopTimer, onStop, onClose,
}: VoiceModalProps) {
  const showRecipe = !!parsedRecipe && state !== 'processing';
  const timerActive = timer.active || timer.done;

  const pct = timer.totalSeconds > 0
    ? Math.round(((timer.totalSeconds - timer.seconds) / timer.totalSeconds) * 100)
    : 0;

  const centerBtnStyle =
    state === 'speaking'
      ? { background: 'linear-gradient(135deg, #D4A843, #A07830)', boxShadow: '0 8px 30px rgba(212,168,67,0.5)' }
      : state === 'listening'
      ? { background: 'linear-gradient(135deg, #D4A843, #A07830)', boxShadow: '0 8px 30px rgba(212,168,67,0.45)' }
      : { background: 'linear-gradient(135deg, #1E1A08, #2A240D)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' };

  return (
    <div className="voice-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="voice-modal" style={{ maxWidth: showRecipe ? 480 : 380, width: 'calc(100vw - 32px)', position: 'relative' }}>

        {/* ── Persistent Exit button ── */}
        <button
          className="voice-modal-exit-btn"
          onClick={onClose}
          title="Exit Voice Chat"
        >
          <X size={14} />
          Exit
        </button>

        {/* Top label */}
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--primary)',
          marginBottom: 8, textAlign: 'center',
        }}>
          Voice Chat
        </div>

        {/* ── Ring + icon ── */}
        <div className="voice-ring-wrap">
          {state === 'listening' && (
            <>
              <div className="voice-ring" />
              <div className="voice-ring" style={{ animationDelay: '0.4s' }} />
              <div className="voice-ring" style={{ animationDelay: '0.8s' }} />
            </>
          )}
          {state === 'speaking' && (
            <>
              <div className="voice-ring" style={{ animationDuration: '0.9s' }} />
              <div className="voice-ring" style={{ animationDuration: '0.9s', animationDelay: '0.4s' }} />
            </>
          )}
          {state === 'processing' && (
            <div className="voice-ring" style={{ animationDuration: '1.5s', borderColor: 'rgba(212,168,67,0.25)' }} />
          )}
          <button
            className="voice-center-btn"
            onClick={state === 'listening' || state === 'speaking' ? onStop : undefined}
            style={centerBtnStyle}
          >
            {STATE_ICONS[state]}
          </button>
        </div>

        <div className="voice-state-label">{STATE_LABELS[state]}</div>

        {/* Waveform when listening */}
        {state === 'listening' && (
          <div className="voice-waveform">
            {[...Array(7)].map((_, i) => (
              <span key={i} className="voice-wave-bar"
                style={{ animationDelay: `${i * 0.11}s`, height: `${8 + Math.sin(i) * 6}px` }} />
            ))}
          </div>
        )}

        {/* Processing dots */}
        {state === 'processing' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {[0, 0.2, 0.4].map((d, i) => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--primary)',
                animation: `genBounce 1.2s ease-in-out ${d}s infinite`,
              }} />
            ))}
          </div>
        )}

        {/* User transcript */}
        {transcript && state !== 'idle' && (
          <div style={{
            margin: '8px 0 0', padding: '8px 14px',
            background: 'rgba(212,168,67,0.06)',
            border: '1px solid rgba(212,168,67,0.18)',
            borderRadius: 12, fontSize: 12, color: 'var(--text)',
            maxWidth: 300, textAlign: 'center', lineHeight: 1.5,
          }}>
            <span style={{
              fontSize: 9, color: 'var(--primary)', fontWeight: 700,
              display: 'block', marginBottom: 3, letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>You Said</span>
            "{transcript}"
          </div>
        )}

        {/* ── Timer display ── */}
        {timerActive && (
          <div style={{
            width: '100%', marginTop: 12, padding: '12px 16px',
            background: timer.done
              ? 'rgba(34,197,94,0.1)'
              : 'rgba(212,168,67,0.06)',
            border: `1px solid ${timer.done ? 'rgba(34,197,94,0.3)' : 'rgba(212,168,67,0.2)'}`,
            borderRadius: 14,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 28 }}>{timer.done ? '✅' : '⏱'}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: timer.done ? '#22C55E' : 'var(--primary)',
                letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3,
              }}>
                {timer.done ? 'Timer Done!' : `Timer · ${timer.label}`}
              </div>
              {!timer.done && (
                <>
                  <div style={{
                    fontSize: 26, fontWeight: 700, color: 'var(--text)',
                    fontFamily: 'var(--font-mono)', letterSpacing: 2,
                  }}>
                    {fmtTime(timer.seconds)}
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 999, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: 'linear-gradient(90deg, #A07830, #D4A843)',
                      borderRadius: 999, transition: 'width 1s linear',
                      boxShadow: '0 0 8px rgba(212,168,67,0.4)',
                    }} />
                  </div>
                </>
              )}
            </div>
            <button onClick={onStopTimer} style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text-sub)', fontSize: 11, padding: '4px 10px',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'background 0.2s, border-color 0.2s',
            }}>
              {timer.done ? 'Dismiss' : 'Stop'}
            </button>
          </div>
        )}

        {/* ── Recipe card while speaking ── */}
        {showRecipe && (
          <div style={{
            width: '100%', marginTop: 12,
            background: 'var(--card)',
            border: '1px solid rgba(212,168,67,0.15)',
            borderRadius: 16, overflow: 'hidden',
            maxHeight: 340, overflowY: 'auto',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(212,168,67,0.06)',
          }}>
            <div style={{
              padding: '10px 14px',
              background: 'linear-gradient(135deg, rgba(212,168,67,0.08), rgba(160,120,48,0.04))',
              borderBottom: '1px solid rgba(212,168,67,0.1)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{
                padding: '3px 10px',
                background: 'linear-gradient(135deg, #D4A843, #A07830)',
                borderRadius: 999, fontSize: 9, fontWeight: 700,
                color: '#0D0B05', letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                🍽 Recipe
              </span>
              {state === 'speaking' && (
                <span style={{ fontSize: 11, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ animation: 'pulse 1s ease-in-out infinite', display: 'inline-block' }}>🔊</span>
                  Speaking…
                </span>
              )}
              {state === 'listening' && (
                <span style={{ fontSize: 11, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ animation: 'pulse 1s ease-in-out infinite', display: 'inline-block' }}>🎙</span>
                  Listening…
                </span>
              )}
            </div>

            <div style={{ padding: '12px 14px' }}>
              {parsedRecipe.intro && (
                <p style={{
                  fontSize: 12, color: 'var(--text-sub)', fontStyle: 'italic',
                  lineHeight: 1.55, marginBottom: 10,
                  borderLeft: '2px solid rgba(212,168,67,0.3)', paddingLeft: 8,
                }}>
                  {parsedRecipe.intro}
                </p>
              )}

              {parsedRecipe.ingredients.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: 'var(--primary)',
                    letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7,
                  }}>
                    🛒 Ingredients
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {parsedRecipe.ingredients.slice(0, 8).map((ing, i) => (
                      <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px',
                        background: 'rgba(212,168,67,0.06)',
                        border: '1px solid rgba(212,168,67,0.15)',
                        borderRadius: 20, fontSize: 11, color: 'var(--text)',
                      }}>
                        {ingredientEmoji(ing)} {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,168,67,0.12), transparent)', margin: '8px 0' }} />

              <div>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: 'var(--primary)',
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
                }}>
                  👨‍🍳 Steps
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {parsedRecipe.steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #D4A843, #A07830)',
                        color: '#0D0B05', fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(212,168,67,0.3)',
                      }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.55, flex: 1, paddingTop: 2 }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hint */}
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center', lineHeight: 1.6 }}>
          {state === 'listening'
            ? 'Speak your recipe or "set timer for X minutes"'
            : state === 'speaking'
            ? 'Will listen again after · Tap Stop to cancel'
            : state === 'processing'
            ? 'Generating recipe…'
            : 'Say something to start!'}
        </p>

        {/* Stop button — only when active */}
        {(state === 'listening' || state === 'speaking') && (
          <button className="voice-close-btn" onClick={onStop}
            style={{ background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.25)', color: '#F87171', marginTop: 8 }}>
            ■ Stop
          </button>
        )}
      </div>
    </div>
  );
}
