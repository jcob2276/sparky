/**
 * Scala nowy wiersz z synchronizacji z tym, co już jest w bazie: pole, którego źródło tym razem nie zwróciło (`null`),
 * zachowuje dotychczasową wartość. Bez tego częściowa odpowiedź API (np. brak sesji snu w jednym przebiegu) kasowała
 * wcześniej zapisany sen.
 */
export function keepExistingWhenMissing<T extends Record<string, unknown>>(next: T, existing: Record<string, unknown> | null | undefined): T {
  if (!existing) return next;
  const merged: Record<string, unknown> = { ...next };
  for (const [key, value] of Object.entries(next)) {
    if (value == null && existing[key] != null) merged[key] = existing[key];
  }
  return merged as T;
}
