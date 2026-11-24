import { useCallback, useState } from 'react';

const STORAGE_KEY = 'sparky.recipes.favorites';

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(parsed)) return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    // uszkodzone lub niedostępne dane: zaczynamy od pustej listy
  }
  return [];
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ulubione działają także bez zapisu
  }
}

/** Ulubione przepisy; pamiętane na tym urządzeniu. */
export function useRecipeFavorites() {
  const [ids, setIds] = useState<string[]>(read);

  const toggle = useCallback((id: string) => setIds((current) => {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    write(next);
    return next;
  }), []);

  return { ids, toggle };
}
