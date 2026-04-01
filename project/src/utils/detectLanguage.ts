const HINGLISH_PATTERN = /\b(yaar|bhai|kya|hai|hain|karo|banao|batao|chahiye|mujhe|mera|tera|aur|se|ko|ka|ki|ke|hum|tum|aap|yeh|woh|kaise|kitna|accha|theek|nahi|hoga|laga|dalo|dekho|suno|bol|bolo|hua|thi|tha|raha|rahi|wala|wali|khana|peena|banana|sikhao|dikhao|kab|kuch|sab|bahut|zyada|kam|jaldi|abhi|phir|dobara|mast|ekdum|bilkul|seedha|seedhi|zaroor|zaruri|thoda|zyada|ek|do|teen|char|paanch|namak|masala|tamatar|pyaz|adrak|lahsun)\b/i;

export function detectLanguage(text: string): 'hinglish' | 'english' {
  return HINGLISH_PATTERN.test(text) ? 'hinglish' : 'english';
}
