import React from 'react';
import { MessageCircle, Send, Copy, X } from 'lucide-react';
import {
  Dialog,
  DialogContentSheet,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';

interface ShareModalProps {
  text: string;
  onClose: () => void;
}

export function ShareModal({ text, onClose }: ShareModalProps) {
  const shareText = `🍳 Recipe from ChefMate AI:\n\n${text}\n\n🤖 Powered by ChefMate`;

  const shareWhatsApp = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');

  const shareTelegram = () =>
    window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(shareText)}`, '_blank');

  const copyClipboard = () => {
    navigator.clipboard.writeText(shareText).then(() => onClose());
  };

  const options = [
    {
      icon: <MessageCircle size={20} className="text-[#25D366]" />,
      label: 'Share on WhatsApp',
      sub: 'Open WhatsApp web',
      action: shareWhatsApp,
      color: 'hover:border-[rgba(37,211,102,0.35)]',
    },
    {
      icon: <Send size={20} className="text-[#2AABEE]" />,
      label: 'Share on Telegram',
      sub: 'Open Telegram web',
      action: shareTelegram,
      color: 'hover:border-[rgba(42,171,238,0.35)]',
    },
    {
      icon: <Copy size={20} className="text-[#34D399]" />,
      label: 'Copy to Clipboard',
      sub: 'Paste anywhere',
      action: copyClipboard,
      color: 'hover:border-[rgba(52,211,153,0.35)]',
    },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContentSheet>
        {/* Screen-reader title/desc (hidden visually) */}
        <DialogTitle className="sr-only">Share Recipe</DialogTitle>
        <DialogDescription className="sr-only">
          Choose a platform to share this recipe
        </DialogDescription>

        {/* Visible header */}
        <div className="mb-5">
          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-[#2D4A3A] mb-1">
            Share Recipe
          </p>
          <h2
            className="text-[22px] font-semibold text-[#ECFDF5] tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Send it to someone
          </h2>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2.5 mb-4">
          {options.map(({ icon, label, sub, action, color }) => (
            <button
              key={label}
              onClick={action}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border border-[rgba(52,211,153,0.1)] bg-[#131D17] text-left transition-all duration-200 hover:bg-[#192A1F] hover:-translate-y-0.5 ${color} group`}
            >
              <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
                {icon}
              </span>
              <span className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-semibold text-[#ECFDF5] group-hover:text-[#34D399] transition-colors">
                  {label}
                </span>
                <span className="text-xs text-[#2D4A3A] mt-0.5">{sub}</span>
              </span>
              <svg className="w-4 h-4 text-[#2D4A3A] group-hover:text-[#34D399] transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Cancel */}
        <Button
          variant="secondary"
          className="w-full h-11 text-sm font-medium"
          onClick={onClose}
        >
          <X size={15} />
          Cancel
        </Button>
      </DialogContentSheet>
    </Dialog>
  );
}
