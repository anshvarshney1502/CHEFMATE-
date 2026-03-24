import { useState } from 'react';
import type { ParsedRecipe } from '../utils/parseRecipe';
import type { Message } from '../hooks/useSessions';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
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
  if (/bread|roti|naan|bun/.test(t)) return '🫓';
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

type Difficulty = 'easy' | 'medium' | 'hard';

function difficultyInfo(steps: number): { label: string; variant: Difficulty } {
  if (steps <= 3) return { label: 'Easy', variant: 'easy' };
  if (steps <= 5) return { label: 'Medium', variant: 'medium' };
  return { label: 'Advanced', variant: 'hard' };
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
  const diff = difficultyInfo(parsed.steps.length);

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
        <div className="flex items-center gap-2">
          <Badge variant={diff.variant as any}>{diff.label}</Badge>
          <Badge variant="muted">{parsed.steps.length} steps</Badge>
        </div>
      </div>

      {/* Intro */}
      {parsed.intro && (
        <p className="recipe-intro">
          {parsed.intro}
        </p>
      )}

      {/* Ingredients */}
      {parsed.ingredients.length > 0 && (
        <div className="recipe-section">
          <div className="recipe-section-label">
            🛒 Ingredients · {parsed.ingredients.length} items
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
      <div className="recipe-section">
        <div className="recipe-section-label">👨‍🍳 Method</div>
        <div className="steps-list">
          {parsed.steps.map((step, i) => (
            <div
              key={i}
              className="step-row"
              onClick={() => handleCopyStep(step, i)}
              style={{ cursor: 'pointer' }}
            >
              <span className="step-number">{i + 1}</span>
              <span className="step-text">
                {copiedStep === i ? (
                  <span className="flex items-center gap-1.5 text-[#34D399] italic text-xs">
                    <CheckCircle2 size={13} />
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

      {/* Footer badges */}
      <div className="flex gap-1.5 flex-wrap px-5 pb-3">
        <span className="recipe-meta-badge">🥗 {parsed.ingredients.length || '?'} ingredients</span>
        <span className="recipe-meta-badge">📋 {parsed.steps.length} steps</span>
        {message.saved && (
          <Badge variant="gold">⭐ Saved</Badge>
        )}
      </div>

      {/* Actions */}
      {!streaming && (
        <div className="recipe-actions">
          <Button variant="secondary" size="sm" onClick={onCopy}>
            <Copy size={13} /> Copy
          </Button>
          <Button variant="secondary" size="sm" onClick={onSpeak}>
            <Volume2 size={13} /> Speak
          </Button>
          <Button
            variant={message.saved ? 'gold' : 'secondary'}
            size="sm"
            onClick={onSave}
          >
            <Star size={13} fill={message.saved ? 'currentColor' : 'none'} />
            {message.saved ? 'Saved' : 'Save'}
          </Button>
          <Button variant="secondary" size="sm" onClick={onShare}>
            <Share2 size={13} /> Share
          </Button>
          <Button variant="secondary" size="sm" onClick={onSetTimer}>
            <Timer size={13} /> Timer
          </Button>
          <Button variant="secondary" size="sm" onClick={onAddGrocery}>
            <ShoppingCart size={13} /> Grocery
          </Button>
        </div>
      )}
    </div>
  );
}
