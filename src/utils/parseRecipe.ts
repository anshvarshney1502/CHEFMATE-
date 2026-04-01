export interface ParsedRecipe {
  intro: string;
  ingredients: string[];
  steps: string[];
}

const MEASURE_RE = /\d[\d./]*\s*(cups?|tbsp|tsp|g\b|kg|ml|oz|lb|pieces?|cloves?|slices?|pinch|dash)/i;
const FOOD_RE    = /\b(oil|butter|salt|pepper|garlic|onion|pasta|noodle|rice|flour|egg|milk|cream|sugar|water|broth|sauce|cheese|chicken|beef|pork|lamb|fish|shrimp|tofu|tomato|potato|carrot|spinach|broccoli|lemon|lime|ginger|cumin|coriander|basil|oregano|thyme|chili|paprika|soy|vinegar|honey|herb|spice|bread|roti|dal|masala|paneer|ghee|mango|coconut|tea|chai|cardamom|garam|turmeric)\b/i;
const COOK_VERB  = /\b(add|heat|stir|mix|cook|boil|fry|bake|simmer|pour|chop|slice|serve|let|put|place|remove|cover|season|blend|wash|drain|spread|roll|knead|steep|strain|garnish|saute|sauté|roast|grill)\b/i;

const ORDINAL_SPLIT = /(?=\b(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Finally|Next|Then|After(?:wards?)?)[,: ])/i;
const ORDINAL_TRIM  = /^\b(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Finally|Next|Then|After(?:wards?)?)[,: ]*/i;

function cleanModelNoise(text: string): string {
  return text
    .replace(/\b(Under|Keep)\s+(below\s+)?\d+\s+words?[^a-zA-Z]*/gi, ' ')
    .replace(/\bChefMate:\s+[\s\S]*$/i, '')
    .replace(/\[([^\]]+)\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractIngredients(section: string): string[] {
  const ingLabel = section.match(/\bIngredients?:\s*/i);
  if (ingLabel?.index != null) {
    // Extract from "Ingredients:" label to end of that sentence / newline
    const raw = section.slice(ingLabel.index + ingLabel[0].length);
    // Stop at period-then-capital (next sentence) or end
    const sentEnd = raw.search(/\.\s+[A-Z]/);
    const ingText = sentEnd > 0 ? raw.slice(0, sentEnd) : raw;
    return ingText
      .split(/[,\n]/)
      .map(s => s.replace(/^[-•*]\s*/, '').replace(/\.$/, '').trim())
      .filter(s => s.length > 1 && s.length < 60);
  }

  // No label — try comma-delimited food words
  const parts = section
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

  let beforeSteps = '';
  let steps: string[] = [];

  // ── Path 1: "Steps:" keyword ──────────────────────────────────────────────
  const stepsKw = cleaned.match(/\bSteps?:\s*/i);
  if (stepsKw?.index != null) {
    beforeSteps = cleaned.slice(0, stepsKw.index).trim();
    const after = cleaned.slice(stepsKw.index + stepsKw[0].length);
    steps = after
      .split(/(?=\d+\.\s)/)
      .map(s => s.replace(/^\d+\.\s*/, '').split('\n')[0].trim())
      .filter(s => s.length > 4 && !/^(Under|Keep|Less|Note|ChefMate|Total)/i.test(s))
      .slice(0, 8);
    // Steps: found but no numbers — split by newlines
    if (steps.length === 0) {
      steps = after.split('\n').map(s => s.trim()).filter(s => s.length > 8).slice(0, 8);
    }
  }

  // ── Path 2: Standalone numbered list "1. …" ───────────────────────────────
  if (steps.length === 0) {
    const m = cleaned.match(/\b1\.\s/);
    if (m?.index != null) {
      beforeSteps = cleaned.slice(0, m.index).trim();
      steps = cleaned.slice(m.index)
        .split(/(?=\d+\.\s)/)
        .map(s => s.replace(/^\d+\.\s*/, '').split('\n')[0].trim())
        .filter(s => s.length > 4)
        .slice(0, 8);
    }
  }

  // ── Path 3: Ordinal words (First, Second, Finally …) ─────────────────────
  if (steps.length === 0) {
    const parts = cleaned.split(ORDINAL_SPLIT)
      .map(s => s.replace(ORDINAL_TRIM, '').replace(/\n[\s\S]*/g, '').trim())
      .filter(s => s.length > 5);
    if (parts.length >= 2) { beforeSteps = ''; steps = parts.slice(0, 8); }
  }

  // ── Path 4: Inline "Ingredients: list. Prose instructions." ──────────────
  // Small models often output: "Intro. Ingredients: a, b, c. Mix in pan and cook."
  if (steps.length === 0) {
    const ingMatch = cleaned.match(/\bIngredients?:\s*/i);
    if (ingMatch?.index != null) {
      const afterLabel = cleaned.slice(ingMatch.index + ingMatch[0].length);
      // Ingredient list ends at the first "sentence break" (period + space + capital)
      const sentBreak = afterLabel.match(/\.\s+(?=[A-Z])/);
      if (sentBreak?.index != null) {
        // beforeSteps includes everything up to and including the ingredient sentence
        beforeSteps = cleaned.slice(0, ingMatch.index + ingMatch[0].length + sentBreak.index + 1);
        const remainder = afterLabel.slice(sentBreak.index + sentBreak[0].length).trim();
        if (remainder) {
          steps = remainder
            .split(/(?<=[.!?])\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 8)
            .slice(0, 8);
        }
      } else {
        // Whole text after Ingredients: label is ingredient list, no steps
        beforeSteps = cleaned;
      }
    }
  }

  // ── Path 5: Cooking-verb sentence fallback (2+ sentences) ────────────────
  if (steps.length === 0) {
    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.length > 10 && COOK_VERB.test(s));
    if (sentences.length >= 2) { beforeSteps = ''; steps = sentences.slice(0, 8); }
  }

  // ── Extract ingredients from beforeSteps ──────────────────────────────────
  const ingredients = beforeSteps ? extractIngredients(beforeSteps) : [];
  let finalIngredients = ingredients;

  // Always mine food words from full text when no explicit Ingredients section found.
  // Small models often skip the "Ingredients:" label and mention food inline.
  if (finalIngredients.length === 0) {
    const allWords = cleaned.split(/[\s,;:]+/).filter(w => FOOD_RE.test(w));
    finalIngredients = [...new Set(allWords)].slice(0, 10);
  }

  // ── Guard: show recipe card when there are 2+ cooking steps OR 3+ food ingredients ──
  const hasStructuredSteps = steps.length >= 2;
  const hasIngredients     = finalIngredients.length >= 3;

  if (!hasStructuredSteps && !hasIngredients) return null;

  // ── Intro ─────────────────────────────────────────────────────────────────
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
