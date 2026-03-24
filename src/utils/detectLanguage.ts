// Only unambiguous conversational Hindi words — food terms excluded
// (masala, chai, paneer, etc. appear in English recipe queries too)
const HINGLISH_WORDS = /\b(yaar|bhai|hain|karo|banao|batao|chahiye|mujhe|mera|tera|hum|tum|kaise|accha|achha|theek|nahi|nahin|hoga|dalo|dekho|suno|bolo|wala|wali|ekdum|bilkul|zaroor|zaruri|thoda|zyada|seedha|seedhi|mast|kya(?!\s+is))\b/gi;

export function detectLanguage(text: string): 'hinglish' | 'english' {
  const matches = text.match(HINGLISH_WORDS);
  return matches && matches.length >= 1 ? 'hinglish' : 'english';
}
