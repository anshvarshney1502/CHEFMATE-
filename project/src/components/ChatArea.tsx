import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import type { Message, Session } from '../hooks/useSessions';

const QUICK_CHIPS = [
  { e: '🍗', t: 'Butter Chicken',    q: 'Give me a Butter Chicken recipe' },
  { e: '🍝', t: 'Quick Pasta',       q: 'Quick pasta recipe' },
  { e: '☕', t: 'Masala Chai',       q: 'How to make Masala Chai' },
  { e: '🍫', t: 'Choco Cake',        q: 'Easy Chocolate Cake recipe' },
  { e: '🥚', t: 'Use What I Have',   q: 'What can I cook with eggs and bread?' },
  { e: '🥗', t: 'Healthy Breakfast', q: 'Suggest a healthy breakfast' },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
}

interface ChatAreaProps {
  session: Session;
  onQuickChip: (q: string) => void;
  onCopy: (text: string) => void;
  onSpeak: (text: string) => void;
  onSave: (msg: Message) => void;
  onShare: (text: string) => void;
  onSetTimer: (text: string) => void;
  onAddGrocery: (ingredients: string[]) => void;
}

export function ChatArea({
  session,
  onQuickChip,
  onCopy,
  onSpeak,
  onSave,
  onShare,
  onSetTimer,
  onAddGrocery,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages]);

  if (session.messages.length === 0) {
    return (
      <div className="chat-area chat-scroll" style={{ justifyContent: 'center' }}>
        <div className="welcome-screen">
          <div className="welcome-glow" />

          {/* Chef emoji with ambient ring */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute',
              inset: -20,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <span className="welcome-chef-emoji">👨‍🍳</span>
          </div>

          {/* Greeting */}
          <div style={{ textAlign: 'center' }}>
            <h1 className="welcome-greeting">{greeting()}, Chef!</h1>
            <p className="welcome-sub" style={{ marginTop: 10 }}>
              Ask me anything about cooking<br />
              <span style={{ fontSize: 13, opacity: 0.7 }}>English mein ya Hinglish mein bolo 🎙</span>
            </p>
          </div>

          {/* Feature chips */}
          <div style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: 4,
          }}>
            {['🔒 100% Private', '✈️ Works Offline', '⚡ On-Device AI'].map(label => (
              <span
                key={label}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '4px 11px',
                  borderRadius: 999,
                  background: 'rgba(52,211,153,0.06)',
                  border: '1px solid rgba(52,211,153,0.14)',
                  color: 'var(--text-sub)',
                  letterSpacing: '0.04em',
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Quick chips */}
          <div className="welcome-chips">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.t}
                className="welcome-chip"
                onClick={() => onQuickChip(chip.q)}
              >
                <span>{chip.e}</span>
                {chip.t}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area chat-scroll">
      {session.messages.map(msg => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onCopy={onCopy}
          onSpeak={onSpeak}
          onSave={onSave}
          onShare={onShare}
          onSetTimer={onSetTimer}
          onAddGrocery={onAddGrocery}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
