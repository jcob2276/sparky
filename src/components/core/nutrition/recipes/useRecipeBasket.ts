import { useCallback, useState } from 'react';

const STORAGE_KEY = 'sparky.recipes.basket';

interface BasketState {
  ids: string[];
  checked: string[];
}

function read(): BasketState {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (parsed && typeof parsed === 'object') {
      const { ids, checked } = parsed as Partial<BasketState>;
      return {
        ids: Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [],
        checked: Array.isArray(checked) ? checked.filter((key) => typeof key === 'string') : [],
      };
    }
  } catch {
    // uszkodzone lub niedostępne dane: zaczynamy od pustego koszyka
  }
  return { ids: [], checked: [] };
}

function write(state: BasketState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // koszyk działa także bez zapisu
  }
}

/** Wybrane przepisy i odhaczone pozycje listy zakupów; pamiętane na tym urządzeniu. */
export function useRecipeBasket() {
  const [state, setState] = useState<BasketState>(read);

  const update = useCallback((change: (current: BasketState) => BasketState) => {
    setState((current) => {
      const next = change(current);
      write(next);
      return next;
    });
  }, []);

  const toggleRecipe = useCallback((id: string) => update((current) => ({
    ...current,
    ids: current.ids.includes(id) ? current.ids.filter((item) => item !== id) : [...current.ids, id],
  })), [update]);

  const toggleChecked = useCallback((key: string) => update((current) => ({
    ...current,
    checked: current.checked.includes(key) ? current.checked.filter((item) => item !== key) : [...current.checked, key],
  })), [update]);

  const clear = useCallback(() => update(() => ({ ids: [], checked: [] })), [update]);

  return { ids: state.ids, checked: state.checked, toggleRecipe, toggleChecked, clear };
}
