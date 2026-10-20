import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../../../lib/constants';

export function useDashboardTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEYS.THEME) || 'light');
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem(STORAGE_KEYS.THEME, theme); } catch (e: unknown) {
      console.warn('[useDashboardState] Failed to save theme to localStorage:', e);
    }
  }, [theme]);
  const toggleTheme = useCallback(() => setTheme(prev => prev === 'light' ? 'dark' : 'light'), []);
  return { theme, toggleTheme };
}
