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

const FEATURE_PILLS = [
  { icon: '🔒', label: '100% Private' },
  { icon: '✈️', label: 'Works Offline' },
  { icon: '⚡', label: 'On-Device AI' },
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
  onSetTimer: () => void;
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
      <div className="chat-area chat-scroll welcome-outer">
        <div className="welcome-screen">
          {/* Ambient glow */}
          <div className="welcome-glow" />
          <div className="welcome-glow-2" />

          {/* Chef emoji */}
          <div className="welcome-chef-wrap">
            <div className="welcome-chef-ring welcome-chef-ring-1" />
            <div className="welcome-chef-ring welcome-chef-ring-2" />
            <span className="welcome-chef-emoji">👨‍🍳</span>
          </div>

          {/* Greeting */}
          <div style={{ textAlign: 'center' }}>
            <p className="welcome-eyebrow">Your AI kitchen companion</p>
            <h1 className="welcome-greeting">{greeting()}, Chef!</h1>
            <p className="welcome-sub">
              Ask me anything about cooking
            </p>
          </div>

          {/* Feature pills */}
          <div className="welcome-feature-pills">
            {FEATURE_PILLS.map(({ icon, label }) => (
              <span key={label} className="welcome-feature-pill">
                <span>{icon}</span>
                {label}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div className="welcome-divider">
            <span className="welcome-divider-line" />
            <span className="welcome-divider-text">Try asking</span>
            <span className="welcome-divider-line" />
          </div>

          {/* Quick chips */}
          <div className="welcome-chips">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.t}
                className="welcome-chip"
                onClick={() => onQuickChip(chip.q)}
              >
                <span className="welcome-chip-emoji">{chip.e}</span>
                <span className="welcome-chip-text">{chip.t}</span>
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
