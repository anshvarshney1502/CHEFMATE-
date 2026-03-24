import React from 'react';
import { RecipeCard } from './RecipeCard';
import { parseRecipe } from '../utils/parseRecipe';
import type { Message } from '../hooks/useSessions';

interface MessageBubbleProps {
  message: Message;
  onCopy: (text: string) => void;
  onSpeak: (text: string) => void;
  onSave: (msg: Message) => void;
  onShare: (text: string) => void;
  onSetTimer: (text: string) => void;
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
  const parsed = message.role === 'assistant' ? parseRecipe(message.text) : null;

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
              📋
            </button>
            <button
              className="action-btn"
              onClick={() => onSpeak(message.text)}
              title="Read aloud"
            >
              🔊
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
          {parsed ? (
            <RecipeCard
              parsed={parsed}
              message={message}
              streaming={!!message.streaming}
              onCopy={() => onCopy(message.text)}
              onSpeak={() => onSpeak(message.text)}
              onSave={() => onSave(message)}
              onShare={() => onShare(message.text)}
              onSetTimer={() => onSetTimer(message.text)}
              onAddGrocery={() => onAddGrocery(parsed.ingredients)}
            />
          ) : (
            <div className="ai-bubble">
              {message.streaming && (
                <span className="generating-badge" style={{ display: 'inline-flex', marginBottom: 8 }}>
                  <span className="streaming-cursor" />
                  generating…
                </span>
              )}
              {message.text}
              {message.streaming && <span className="streaming-cursor" />}
            </div>
          )}

          {!message.streaming && (
            <div className="message-actions">
              <button className="action-btn" onClick={() => onCopy(message.text)} title="Copy">📋 Copy</button>
              <button className="action-btn" onClick={() => onSpeak(message.text)} title="Read aloud">🔊 Speak</button>
              <button
                className={`action-btn${message.saved ? ' saved' : ''}`}
                onClick={() => onSave(message)}
                title="Save"
              >
                {message.saved ? '⭐' : '☆'} Save
              </button>
              <button className="action-btn" onClick={() => onShare(message.text)} title="Share">📤 Share</button>
            </div>
          )}

          <span className="message-timestamp">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}
