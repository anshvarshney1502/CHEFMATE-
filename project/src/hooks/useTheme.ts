import { useState, useEffect } from 'react';
import { getTheme, saveTheme } from '../utils/storage';

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(getTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      saveTheme(next);
      return next;
    });
  };

  return { theme, toggleTheme };
}
