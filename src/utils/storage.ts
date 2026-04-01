export interface SavedRecipe {
  id: string;
  title: string;
  text: string;
  savedAt: string;
  sessionId?: string;
}

export interface GroceryItem {
  id: string;
  text: string;
  checked: boolean;
}

/** Safely write to localStorage — silently swallows QuotaExceededError. */
function safeSave(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('[ChefMate] localStorage write failed:', e);
  }
}

/* ── Saved Recipes ── */
export function getSavedRecipes(): SavedRecipe[] {
  try { return JSON.parse(localStorage.getItem('chefmate-saved') || '[]'); } catch { return []; }
}

export function saveRecipe(recipe: SavedRecipe): void {
  const list = getSavedRecipes();
  list.unshift(recipe);
  safeSave('chefmate-saved', JSON.stringify(list.slice(0, 20)));
}

export function deleteSavedRecipe(id: string): void {
  safeSave('chefmate-saved', JSON.stringify(getSavedRecipes().filter(r => r.id !== id)));
}

/* ── Grocery ── */
export function getGroceryItems(): GroceryItem[] {
  try { return JSON.parse(localStorage.getItem('chefmate-grocery') || '[]'); } catch { return []; }
}

export function addGroceryItems(items: string[]): void {
  const existing = getGroceryItems();
  const newItems: GroceryItem[] = items.map(text => ({
    id: crypto.randomUUID(),
    text,
    checked: false,
  }));
  safeSave('chefmate-grocery', JSON.stringify([...existing, ...newItems]));
}

export function toggleGroceryItem(id: string): void {
  const items = getGroceryItems().map(i => i.id === id ? { ...i, checked: !i.checked } : i);
  safeSave('chefmate-grocery', JSON.stringify(items));
}

export function clearGroceryItems(): void {
  try { localStorage.removeItem('chefmate-grocery'); } catch { /* ignore */ }
}

/* ── Theme ── */
export function getTheme(): 'dark' | 'light' {
  return (localStorage.getItem('chefmate-theme') as 'dark' | 'light') || 'dark';
}

export function saveTheme(theme: 'dark' | 'light'): void {
  safeSave('chefmate-theme', theme);
}
