import { useState } from 'react';
import type { ParsedRecipe } from '../utils/parseRecipe';
import type { Message } from '../hooks/useSessions';
import { Badge } from './ui/badge';
import {
  Copy, Volume2, Star, Share2, Timer, ShoppingCart, CheckCircle2,
} from 'lucide-react';

interface RecipeCardProps {
  parsed: ParsedRecipe;
  message: Message;
  streaming: boolean;
  onCopy: () => void;
  onSpeak: () => void;
  onSave: () => void;
  onShare: () => void;
  onSetTimer: () => void;
  onAddGrocery: () => void;
}

function ingredientEmoji(text: string): string {
  const t = text.toLowerCase();
  if (/pasta|noodle|spaghetti|macaroni|penne/.test(t)) return '🍝';
  if (/rice|biryani/.test(t)) return '🍚';
  if (/bread|roti|naan|bun|chapati|paratha/.test(t)) return '🫓';
  if (/egg/.test(t)) return '🥚';
  if (/milk|cream/.test(t)) return '🥛';
  if (/butter|ghee/.test(t)) return '🧈';
  if (/cheese|paneer/.test(t)) return '🧀';
  if (/chicken/.test(t)) return '🍗';
  if (/beef|mutton|lamb/.test(t)) return '🥩';
  if (/pork/.test(t)) return '🥓';
  if (/fish|salmon|tuna|shrimp|prawn/.test(t)) return '🐟';
  if (/tomato/.test(t)) return '🍅';
  if (/garlic/.test(t)) return '🧄';
  if (/onion/.test(t)) return '🧅';
  if (/potato/.test(t)) return '🥔';
  if (/carrot/.test(t)) return '🥕';
  if (/spinach|kale|lettuce|greens/.test(t)) return '🥬';
  if (/broccoli/.test(t)) return '🥦';
  if (/lemon|lime/.test(t)) return '🍋';
  if (/mango/.test(t)) return '🥭';
  if (/coconut/.test(t)) return '🥥';
  if (/oil/.test(t)) return '🫒';
  if (/salt|pepper|spice|masala|cumin|turmeric|chili|paprika/.test(t)) return '🧂';
  if (/sugar|honey/.test(t)) return '🍯';
  if (/flour/.test(t)) return '🌾';
  if (/water|broth|stock/.test(t)) return '💧';
  if (/sauce|dal/.test(t)) return '🫙';
  if (/ginger/.test(t)) return '🫚';
  return '🌿';
}

function difficultyData(steps: number) {
  if (steps <= 3) return { emoji: '🌿', label: 'Easy',     color: '#4ADE80' };
  if (steps <= 5) return { emoji: '🔥', label: 'Medium',   color: '#FB923C' };
  return            { emoji: '⚡', label: 'Advanced', color: '#A78BFA' };
}

function cookTimeEstimate(steps: number, ingredients: number): string {
  if (steps === 0) return '~5 min';
  const base = steps * 4 + ingredients * 1;
  if (base <= 15) return '~10 min';
  if (base <= 28) return '~20 min';
  if (base <= 40) return '~35 min';
  return '~45 min';
}

export function RecipeCard({
  parsed,
  message,
  streaming,
  onCopy,
  onSpeak,
  onSave,
  onShare,
  onSetTimer,
  onAddGrocery,
}: RecipeCardProps) {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [showTime, setShowTime]     = useState(false);
  const diff    = difficultyData(parsed.steps.length);
  const time    = cookTimeEstimate(parsed.steps.length, parsed.ingredients.length);

  const handleCopyStep = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(idx);
    setTimeout(() => setCopiedStep(null), 1500);
  };

  return (
    <div className="recipe-card">
      {/* Header */}
      <div className="recipe-card-header">
        <div className="flex items-center gap-2.5">
          <span className="recipe-badge">🍽 Recipe</span>
          {streaming && (
            <span className="generating-badge">
              <span className="streaming-cursor" />
              generating…
            </span>
          )}
        </div>

        {/* Interactive flip pill — click to toggle difficulty ↔ cook time */}
        <button
          className="recipe-diff-pill"
          onClick={() => setShowTime(v => !v)}
          title={showTime ? 'Click to see difficulty' : 'Click to see cook time'}
          style={{ '--diff-color': diff.color } as React.CSSProperties}
        >
          <span className="recipe-diff-icon">
            {showTime ? '⏱' : diff.emoji}
          </span>
          <span className="recipe-diff-label">
            {showTime ? time : diff.label}
          </span>
          <span className="recipe-diff-toggle">
            {showTime ? diff.emoji : '⏱'}
          </span>
        </button>
      </div>

      {/* Intro */}
      {parsed.intro && (
        <p className="recipe-intro">{parsed.intro}</p>
      )}

      {/* Ingredients */}
      {parsed.ingredients.length > 0 && (
        <div className="recipe-section">
          <div className="recipe-section-label">
            🛒 Ingredients
            <span className="recipe-count-badge">{parsed.ingredients.length} items</span>
          </div>
          <div className="ingredients-grid">
            {parsed.ingredients.map((ing, i) => (
              <span key={i} className="ingredient-pill">
                <span>{ingredientEmoji(ing)}</span>
                <span>{ing}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="recipe-divider" style={{ margin: '0 20px' }} />

      {/* Steps */}
      {parsed.steps.length > 0 && (
        <div className="recipe-section">
          <div className="recipe-section-label">👨‍🍳 Method</div>
          <div className="steps-list">
            {parsed.steps.map((step, i) => (
              <div
                key={i}
                className="step-row"
                onClick={() => handleCopyStep(step, i)}
                style={{ cursor: 'pointer' }}
                title="Click to copy step"
              >
                <span className="step-number">{i + 1}</span>
                <span className="step-text">
                  {copiedStep === i ? (
                    <span className="flex items-center gap-1.5 text-[#34D399] italic text-xs">
                      <CheckCircle2 size={12} />
                      Copied!
                    </span>
                  ) : step}
                </span>
              </div>
            ))}
            {streaming && (
              <div className="step-row">
                <span className="step-number" style={{ background: 'var(--border)' }}>…</span>
                <span className="step-text" style={{ color: 'var(--text-muted)' }}>
                  <span className="streaming-cursor" /> generating…
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer meta */}
      <div className="recipe-footer-meta">
        <span className="recipe-meta-badge">
          🌶 {parsed.ingredients.length} ingredients
        </span>
        {parsed.steps.length > 0 && (
          <span className="recipe-meta-badge">
            📋 {parsed.steps.length} steps
          </span>
        )}
        {message.saved && (
          <Badge variant="gold">⭐ Saved</Badge>
        )}
      </div>

      {/* Actions */}
      {!streaming && (
        <div className="recipe-actions">
          <button className="recipe-action-btn recipe-action-copy" onClick={onCopy}>
            <Copy size={14} />
            Copy
          </button>
          <button className="recipe-action-btn recipe-action-speak" onClick={onSpeak}>
            <Volume2 size={14} />
            Speak
          </button>
          <button
            className={`recipe-action-btn recipe-action-save${message.saved ? ' active' : ''}`}
            onClick={onSave}
          >
            <Star size={14} fill={message.saved ? 'currentColor' : 'none'} />
            {message.saved ? 'Saved' : 'Save'}
          </button>
          <button className="recipe-action-btn recipe-action-share" onClick={onShare}>
            <Share2 size={14} />
            Share
          </button>
          <button className="recipe-action-btn recipe-action-timer" onClick={onSetTimer}>
            <Timer size={14} />
            Timer
          </button>
          <button className="recipe-action-btn recipe-action-grocery" onClick={onAddGrocery}>
            <ShoppingCart size={14} />
            Grocery
          </button>
        </div>
      )}
    </div>
  );
}
