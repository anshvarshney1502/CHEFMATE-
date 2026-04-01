import React, { useMemo } from 'react';
import { Copy, Volume2, Star, Share2 } from 'lucide-react';
import { RecipeCard } from './RecipeCard';
import { parseRecipe } from '../utils/parseRecipe';
import type { Message } from '../hooks/useSessions';

interface MessageBubbleProps {
  message: Message;
  onCopy: (text: string) => void;
  onSpeak: (text: string) => void;
  onSave: (msg: Message) => void;
  onShare: (text: string) => void;
  onSetTimer: () => void;
  onAddGrocery: (ingredients: string[]) => void;
}

function formatTime(d: Date) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({
  message,
  onCopy,
  onSpeak,
  onSave,
  onShare,
  onSetTimer,
  onAddGrocery,
}: MessageBubbleProps) {
  // Memoise so parseRecipe doesn't re-run for every streaming token of every message
  const parsed = useMemo(
    () => message.role === 'assistant' ? parseRecipe(message.text) : null,
    [message.text, message.role],
  );

  if (message.role === 'user') {
    return (
      <div className="message-row user">
        <div className="message-wrapper">
          <div className="user-bubble">
            {message.text}
          </div>
          <div className="message-actions">
            <button
              className="action-btn"
              onClick={() => onCopy(message.text)}
              title="Copy message"
            >
              <Copy size={11} />
              Copy
            </button>
            <button
              className="action-btn"
              onClick={() => onSpeak(message.text)}
              title="Read aloud"
            >
              <Volume2 size={11} />
              Speak
            </button>
          </div>
          <span className="message-timestamp">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    );
  }

  /* AI message */
  return (
    <div className="message-row assistant">
      <div className="message-wrapper">
        <div className="chef-avatar" aria-hidden>👨‍🍳</div>

        <div className="message-content-col">
          {message.streaming && !message.text && (
            <div className="generating-badge">
              <span className="gen-dot" />
              <span className="gen-dot" />
              <span className="gen-dot" />
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600 }}>generating…</span>
            </div>
          )}
          {parsed ? (
            <RecipeCard
              parsed={parsed}
              message={message}
              streaming={!!message.streaming}
              onCopy={() => onCopy(message.text)}
              onSpeak={() => onSpeak(message.text)}
              onSave={() => onSave(message)}
              onShare={() => onShare(message.text)}
              onSetTimer={onSetTimer}
              onAddGrocery={() => onAddGrocery(parsed.ingredients)}
            />
          ) : (
            <div className="ai-bubble">
              {message.text}
              {message.streaming && message.text && <span className="streaming-cursor" />}
            </div>
          )}

          {!message.streaming && (
            <div className="message-actions">
              <button className="action-btn" onClick={() => onCopy(message.text)} title="Copy">
                <Copy size={11} /> Copy
              </button>
              <button className="action-btn" onClick={() => onSpeak(message.text)} title="Read aloud">
                <Volume2 size={11} /> Speak
              </button>
              <button
                className={`action-btn${message.saved ? ' saved' : ''}`}
                onClick={() => onSave(message)}
                title={message.saved ? 'Saved' : 'Save recipe'}
              >
                <Star size={11} fill={message.saved ? 'currentColor' : 'none'} />
                {message.saved ? 'Saved' : 'Save'}
              </button>
              <button className="action-btn" onClick={() => onShare(message.text)} title="Share">
                <Share2 size={11} /> Share
              </button>
            </div>
          )}

          <span className="message-timestamp">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}
