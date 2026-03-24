import { useState, useRef, useEffect, useCallback } from 'react';
import { ModelCategory } from '@runanywhere/web';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { useModelLoader } from '../hooks/useModelLoader';
import { ModelBanner } from './ModelBanner';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  stats?: { tokens: number; tokPerSec: number; latencyMs: number };
}

const SUGGESTIONS = [
  { emoji: '🍝', text: 'Quick pasta recipe' },
  { emoji: '🍗', text: 'Easy butter chicken' },
  { emoji: '🥗', text: 'Healthy salad ideas' },
  { emoji: '🍰', text: 'Simple dessert recipe' },
];

export function ChatTab() {
  const loader = useModelLoader(ModelCategory.Language);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || generating) return;

    if (loader.state !== 'ready') {
      const ok = await loader.ensure();
      if (!ok) return;
    }

    setInput('');
    const userMsg: Message = { role: 'user', text: msg };
    setMessages((prev) => [...prev, userMsg]);
    setGenerating(true);

    const assistantIdx = messages.length + 1;
    setMessages((prev) => [...prev, { role: 'assistant', text: '' }]);

    try {
      const { stream, result: resultPromise, cancel } = await TextGeneration.generateStream(msg, {
        maxTokens: 512,
        temperature: 0.7,
      });
      cancelRef.current = cancel;

      let accumulated = '';
      for await (const token of stream) {
        accumulated += token;
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIdx] = { role: 'assistant', text: accumulated };
          return updated;
        });
      }

      const result = await resultPromise;
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIdx] = {
          role: 'assistant',
          text: result.text || accumulated,
          stats: {
            tokens: result.tokensUsed,
            tokPerSec: result.tokensPerSecond,
            latencyMs: result.latencyMs,
          },
        };
        return updated;
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIdx] = { role: 'assistant', text: `Error: ${errMsg}` };
        return updated;
      });
    } finally {
      cancelRef.current = null;
      setGenerating(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, generating, messages.length, loader]);

  const handleCancel = () => cancelRef.current?.();

  return (
    <div className="tab-panel chat-panel">
      <style>{`
        .chat-suggestion-btn {
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: #9898BE;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .chat-suggestion-btn:hover {
          border-color: rgba(255,107,53,0.4);
          background: rgba(255,107,53,0.08);
          color: #FF9060;
          transform: translateY(-1px);
        }
        .typing-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #9898BE;
          animation: typingBounce 1.4s ease-in-out infinite;
          margin: 0 1px;
        }
        @keyframes typingBounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        .send-btn {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #FF6B35, #FF9060);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(255,107,53,0.4);
          transition: all 0.2s ease;
        }
        .send-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(255,107,53,0.5); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; background: #3f3f56; box-shadow: none; }
        .stop-btn {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(255,79,109,0.3);
          background: rgba(255,79,109,0.1);
          color: #FF4F6D;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .stop-btn:hover { background: rgba(255,79,109,0.18); }
      `}</style>

      <ModelBanner
        state={loader.state}
        progress={loader.progress}
        error={loader.error}
        onLoad={loader.ensure}
        label="LLM"
      />

      <div className="message-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🍳</div>
            <h3>Chat with ChefMate AI</h3>
            <p>Ask me anything about cooking — recipes, techniques, substitutions, and more!</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  className="chat-suggestion-btn"
                  onClick={() => send(s.text)}
                >
                  {s.emoji} {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="message-avatar">👨‍🍳</div>
            )}
            <div className="message-bubble">
              {msg.text === '' && msg.role === 'assistant' ? (
                <span>
                  <span className="typing-dot" style={{ animationDelay: '0s' }} />
                  <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
                  <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
                </span>
              ) : (
                <p style={{ margin: 0 }}>{msg.text}</p>
              )}
              {msg.stats && (
                <div className="message-stats">
                  <span>{msg.stats.tokens} tokens</span>
                  <span>·</span>
                  <span>{msg.stats.tokPerSec.toFixed(1)} tok/s</span>
                  <span>·</span>
                  <span>{msg.stats.latencyMs.toFixed(0)}ms</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask me a recipe or cooking tip…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={generating}
        />
        {generating ? (
          <button type="button" className="stop-btn" onClick={handleCancel} title="Stop">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            className="send-btn"
            disabled={!input.trim()}
            title="Send"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}
