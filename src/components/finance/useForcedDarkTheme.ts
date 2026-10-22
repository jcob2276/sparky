import { useEffect } from 'react';

/** Finanse mają zawsze ciemny wygląd; poprzedni motyw wraca po wyjściu z widoku. */
export function useForcedDarkTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.add('dark');
    return () => {
      if (!wasDark) root.classList.remove('dark');
    };
  }, []);
}
