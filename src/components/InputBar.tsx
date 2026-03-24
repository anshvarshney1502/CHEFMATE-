import { useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Headphones, Paperclip, ArrowUp, Square } from 'lucide-react';

interface InputBarProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onToggleSTT: () => void;
  onToggleVoiceChat: () => void;
  isListening: boolean;
  isVoiceChatActive: boolean;
  isSending: boolean;
  voiceSupported: boolean;
  isSpeaking: boolean;
  onStopSpeak: () => void;
}

export function InputBar({
  value,
  onChange,
  onSend,
  onToggleSTT,
  onToggleVoiceChat,
  isListening,
  isVoiceChatActive,
  isSending,
  voiceSupported,
  isSpeaking,
  onStopSpeak,
}: InputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isSending) onSend();
    }
  }, [value, isSending, onSend]);

  const voiceTitle = !voiceSupported
    ? 'Voice not supported — use Chrome'
    : isListening ? 'Stop listening' : 'Voice to text';

  return (
    <div className="input-bar-wrap">
      <div className="input-bar">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask me any recipe…"
          rows={1}
          disabled={isSending}
        />

        {isListening && (
          <div className="waveform-row">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="wave-bar"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
        )}

        <div className="input-bar-icons">
          <button
            className={`icon-btn${isListening ? ' listening' : ''}`}
            onClick={onToggleSTT}
            title={voiceTitle}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button
            className={`icon-btn${isVoiceChatActive ? ' voice-chat-active' : ''}`}
            onClick={onToggleVoiceChat}
            title={isVoiceChatActive ? 'Stop voice chat' : 'Start voice chat'}
          >
            <Headphones size={16} />
          </button>
          <button
            className="icon-btn"
            title="Image upload (coming soon)"
            disabled
            style={{ opacity: 0.3, cursor: 'not-allowed' }}
          >
            <Paperclip size={16} />
          </button>
          <button
            className="send-btn"
            onClick={onSend}
            disabled={!value.trim() || isSending}
            title="Send message"
          >
            <ArrowUp size={17} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {isSpeaking && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4, paddingRight: 2 }}>
          <button className="stop-speaking-pill" onClick={onStopSpeak}>
            <Square size={11} fill="currentColor" />
            <span style={{ animation: 'pulse 1s ease-in-out infinite', display: 'inline-block' }}>Speaking…</span>
            Stop
          </button>
        </div>
      )}
    </div>
  );
}
