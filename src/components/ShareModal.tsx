import { useState } from 'react';
import { MessageCircle, Send, Copy, X, Check } from 'lucide-react';

interface ShareModalProps {
  text: string;
  onClose: () => void;
}

export function ShareModal({ text, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const shareText = `🍳 Recipe from ChefMate AI:\n\n${text}\n\n🤖 Powered by ChefMate`;

  const shareWhatsApp = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');

  const shareTelegram = () =>
    window.open(`https://t.me/share/url?url=https://chefmate.app&text=${encodeURIComponent(shareText)}`, '_blank');

  const copyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => { setCopied(false); onClose(); }, 1200);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => { setCopied(false); onClose(); }, 1200);
    }
  };

  const options = [
    {
      icon: <MessageCircle size={22} />,
      label: 'Share on WhatsApp',
      sub: 'Open WhatsApp web',
      action: shareWhatsApp,
      color: '#25D366',
      bg: 'rgba(37,211,102,0.08)',
      border: 'rgba(37,211,102,0.22)',
    },
    {
      icon: <Send size={22} />,
      label: 'Share on Telegram',
      sub: 'Open Telegram web',
      action: shareTelegram,
      color: '#2AABEE',
      bg: 'rgba(42,171,238,0.08)',
      border: 'rgba(42,171,238,0.22)',
    },
    {
      icon: copied ? <Check size={22} /> : <Copy size={22} />,
      label: copied ? 'Copied!' : 'Copy to Clipboard',
      sub: 'Paste anywhere',
      action: copyClipboard,
      color: '#D4A843',
      bg: copied ? 'rgba(212,168,67,0.15)' : 'rgba(212,168,67,0.08)',
      border: copied ? 'rgba(212,168,67,0.45)' : 'rgba(212,168,67,0.22)',
    },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(13,11,5,0.78)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid rgba(212,168,67,0.15)',
          borderBottom: 'none',
          borderRadius: '24px 24px 0 0',
          width: '100%',
          maxWidth: 480,
          padding: '0 20px 32px',
          animation: 'slideUp 0.3s var(--spring)',
          boxShadow: '0 -16px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 999,
          background: 'rgba(212,168,67,0.2)',
          margin: '16px auto 20px',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
              Share Recipe
            </p>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              Send it to someone
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(212,168,67,0.06)',
              border: '1px solid rgba(212,168,67,0.12)',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Share Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {options.map(({ icon, label, sub, action, color, bg, border }) => (
            <button
              key={label}
              onClick={action}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 14,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'transform 0.15s, filter 0.15s',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <span style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color, flexShrink: 0,
              }}>
                {icon}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                  {label}
                </span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {sub}
                </span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px',
            background: 'rgba(212,168,67,0.05)',
            border: '1px solid rgba(212,168,67,0.1)',
            borderRadius: 12,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-body)',
            fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
