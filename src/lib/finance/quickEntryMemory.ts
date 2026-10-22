type EntryKind = 'expense' | 'income';

export interface QuickEntryMemory {
  category: string;
  accountId: string;
}

const key = (kind: EntryKind) => `sparky_finance_quick_${kind}`;

/** Ostatnia kategoria i konto na rodzaj wpisu, żeby kolejny wpis był jednym tapnięciem mniej. */
export function loadQuickEntryMemory(kind: EntryKind): QuickEntryMemory | null {
  try {
    const raw = window.localStorage.getItem(key(kind));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<QuickEntryMemory>;
    return typeof value.category === 'string' && typeof value.accountId === 'string'
      ? { category: value.category, accountId: value.accountId }
      : null;
  } catch {
    return null;
  }
}

export function saveQuickEntryMemory(kind: EntryKind, memory: QuickEntryMemory): void {
  try {
    window.localStorage.setItem(key(kind), JSON.stringify(memory));
  } catch {
    /* pamięć jest tylko wygodą */
  }
}
