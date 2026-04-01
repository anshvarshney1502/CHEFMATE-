import { useState, useCallback } from 'react';
import {
  getGroceryItems,
  addGroceryItems as addItems,
  toggleGroceryItem as toggleItem,
  clearGroceryItems,
  type GroceryItem,
} from '../utils/storage';

export function useGrocery() {
  const [items, setItems] = useState<GroceryItem[]>(getGroceryItems);

  const addGroceryItems = useCallback((newItems: string[]) => {
    addItems(newItems);
    setItems(getGroceryItems());
  }, []);

  const toggleGroceryItem = useCallback((id: string) => {
    toggleItem(id);
    setItems(getGroceryItems());
  }, []);

  const clearAll = useCallback(() => {
    clearGroceryItems();
    setItems([]);
  }, []);

  return { items, addGroceryItems, toggleGroceryItem, clearAll };
}
