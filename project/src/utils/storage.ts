export interface SavedRecipe {
  id: string;
  title: string;
  text: string;
  savedAt: string;
}

export interface GroceryItem {
  id: string;
  text: string;
  checked: boolean;
}

/* ── Saved Recipes ── */
export function getSavedRecipes(): SavedRecipe[] {
  try { return JSON.parse(localStorage.getItem('chefmate-saved') || '[]'); } catch { return []; }
}

export function saveRecipe(recipe: SavedRecipe): void {
  const list = getSavedRecipes();
  list.unshift(recipe);
  localStorage.setItem('chefmate-saved', JSON.stringify(list.slice(0, 20)));
}

export function deleteSavedRecipe(id: string): void {
  localStorage.setItem('chefmate-saved', JSON.stringify(getSavedRecipes().filter(r => r.id !== id)));
}

/* ── Grocery ── */
export function getGroceryItems(): GroceryItem[] {
  try { return JSON.parse(localStorage.getItem('chefmate-grocery') || '[]'); } catch { return []; }
}

export function addGroceryItems(items: string[]): void {
  const existing = getGroceryItems();
  const newItems: GroceryItem[] = items.map(text => ({
    id: `${Date.now()}-${Math.random()}`,
    text,
    checked: false,
  }));
  localStorage.setItem('chefmate-grocery', JSON.stringify([...existing, ...newItems]));
}

export function toggleGroceryItem(id: string): void {
  const items = getGroceryItems().map(i => i.id === id ? { ...i, checked: !i.checked } : i);
  localStorage.setItem('chefmate-grocery', JSON.stringify(items));
}

export function clearGroceryItems(): void {
  localStorage.removeItem('chefmate-grocery');
}

/* ── Theme ── */
export function getTheme(): 'dark' | 'light' {
  return (localStorage.getItem('chefmate-theme') as 'dark' | 'light') || 'dark';
}

export function saveTheme(theme: 'dark' | 'light'): void {
  localStorage.setItem('chefmate-theme', theme);
}
