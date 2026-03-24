export interface ParsedRecipe {
  intro: string;
  ingredients: string[];
  steps: string[];
}

const MEASURE_RE = /\d[\d./]*\s*(cups?|tbsp|tsp|g\b|kg|ml|oz|lb|pieces?|cloves?|slices?|pinch|dash)/i;
const FOOD_RE   = /\b(oil|butter|salt|pepper|garlic|onion|pasta|noodle|rice|flour|egg|milk|cream|sugar|water|broth|sauce|cheese|chicken|beef|pork|lamb|fish|shrimp|tofu|tomato|potato|carrot|spinach|broccoli|lemon|lime|ginger|cumin|coriander|basil|oregano|thyme|chili|paprika|soy|vinegar|honey|herb|spice|bread|roti|dal|masala|paneer|ghee|mango|coconut|tea|chai|cardamom|garam|turmeric)\b/i;

// ── Ordinal words the small model sometimes uses instead of numbers ──
const ORDINAL_SPLIT = /(?=\b(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Finally|Next|Then|After(?:wards?)?)[,: ])/i;
const ORDINAL_TRIM  = /^\b(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Finally|Next|Then|After(?:wards?)?)[,: ]*/i;

function cleanModelNoise(text: string): string {
  return text
    .replace(/\b(Under|Keep)\s+(below\s+)?\d+\s+words?[^a-zA-Z]*/gi, ' ')
    .replace(/\bChefMate:\s+[\s\S]*$/i, '')
    .replace(/\[([^\]]+)\]/g, '')          // remove [timer hints] like [2 cup tea]
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractIngredients(beforeSteps: string): string[] {
  const ingLabel = beforeSteps.match(/\bIngredients?:\s*/i);
  if (ingLabel?.index != null) {
    return beforeSteps
      .slice(ingLabel.index + ingLabel[0].length)
      .split(/[,\n]/)
      .map(s => s.replace(/^[-•*]\s*/, '').trim())
      .filter(s => s.length > 1 && s.length < 60);
  }

  const parts = beforeSteps
    .split(/,\s*|\s+and\s+/gi)
    .map(p => p.replace(/^.*?(?:with|using|:\s+)/i, '').trim())
    .filter(p => p.length > 2 && p.length < 55);

  const measured = parts.filter(p => MEASURE_RE.test(p));
  if (measured.length >= 2) return measured;

  return parts.filter(
    p => (MEASURE_RE.test(p) || FOOD_RE.test(p)) &&
      !/\b(simmer|sauté|saute|cook|then|until|for \d+|minutes?|serving|serve|finish|add)\b/i.test(p)
  );
}

export function parseRecipe(text: string): ParsedRecipe | null {
  const cleaned = cleanModelNoise(text);
  if (cleaned.length < 30) return null;

  /* ── 1. Try numbered steps ── */
  const stepsKw = cleaned.match(/\bSteps?:\s*/i);
  let beforeSteps = '';
  let afterSteps  = '';
  let steps: string[] = [];

  if (stepsKw?.index != null) {
    beforeSteps = cleaned.slice(0, stepsKw.index).trim();
    afterSteps  = cleaned.slice(stepsKw.index + stepsKw[0].length);
  } else {
    const m = cleaned.match(/\b1\.\s/);
    if (m?.index != null) {
      beforeSteps = cleaned.slice(0, m.index).trim();
      afterSteps  = cleaned.slice(m.index);
    }
  }

  if (afterSteps) {
    steps = afterSteps
      .split(/(?=\d+\.\s)/)
      .map(s => s.replace(/^\d+\.\s*/, '').split('\n')[0].trim())
      .filter(s => s.length > 4 && !/^(Under|Keep|Less|Note|ChefMate|Total)/i.test(s))
      .slice(0, 8);
  }

  /* ── 2. Try ordinal words (First, Second, Finally …) ── */
  if (steps.length < 2) {
    const ordinalParts = cleaned.split(ORDINAL_SPLIT)
      .map(s => s.replace(ORDINAL_TRIM, '').replace(/\n[\s\S]*/g, '').trim())
      .filter(s => s.length > 5);

    if (ordinalParts.length >= 2) {
      beforeSteps = '';          // whole text is steps in this case
      steps = ordinalParts.slice(0, 8);
    }
  }

  /* ── 3. Sentence fallback — any 3+ sentences that look like instructions ── */
  if (steps.length < 2) {
    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10 &&
        /\b(add|heat|stir|mix|cook|boil|fry|bake|simmer|pour|chop|slice|serve|let|put|place|remove|cover|season|blend|wash|drain|spread|roll|knead|steep|strain|garnish)\b/i.test(s)
      );

    if (sentences.length >= 2) {
      beforeSteps = '';
      steps = sentences.slice(0, 8);
    }
  }

  if (steps.length < 2) return null;

  /* ── Extract ingredients ── */
  const ingredients = beforeSteps ? extractIngredients(beforeSteps) : [];

  /* ── Mine ingredients from steps if empty ── */
  let finalIngredients = ingredients;
  if (finalIngredients.length === 0) {
    const mined = steps
      .join(' ')
      .split(/[,\s]+/)
      .filter(w => FOOD_RE.test(w));
    finalIngredients = [...new Set(mined)].slice(0, 8);
  }

  /* ── Intro ── */
  const intro = beforeSteps
    ? (beforeSteps.match(/^.+?[.!?]/)?.[0] ?? beforeSteps.slice(0, 120))
    : '';

  return { intro: intro.trim(), ingredients: finalIngredients, steps };
}

export function detectTimerFromText(text: string): { seconds: number; label: string } | null {
  const patterns = [
    { re: /(\d+)\s*hour/i, mult: 3600 },
    { re: /(\d+)\s*hr/i, mult: 3600 },
    { re: /(\d+)\s*minute/i, mult: 60 },
    { re: /(\d+)\s*min/i, mult: 60 },
  ];
  for (const { re, mult } of patterns) {
    const m = text.match(re);
    if (m) return { seconds: parseInt(m[1]) * mult, label: m[0].trim() };
  }
  return null;
}
