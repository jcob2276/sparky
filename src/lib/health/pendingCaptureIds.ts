/**
 * ID operacji zapisu posiłku trzymane do pełnego sukcesu. Ponowienie po błędzie albo utraconej odpowiedzi
 * używa tych samych ID, więc RPC (ON CONFLICT(id) DO NOTHING) nie tworzy drugiego posiłku. Po sukcesie
 * kolejna, celowa operacja dostaje nowe ID.
 */
const pending = new Map<string, string>();

export function pendingCaptureId(key: string): string {
  let id = pending.get(key);
  if (!id) {
    id = crypto.randomUUID();
    pending.set(key, id);
  }
  return id;
}

export function settleCaptures(keys: readonly string[]): void {
  for (const key of keys) pending.delete(key);
}
