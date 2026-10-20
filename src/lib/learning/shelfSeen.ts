const KEY_PREFIX = 'sparky_shelf_seen_';
const MAX_REMEMBERED = 500;

/** Które pozycje półki już pokazały animację wsunięcia. Tylko wygoda: bez storage po prostu animuje świeże. */
export function loadSeen(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${userId}`);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export function markSeen(userId: string, ids: string[]): void {
  if (!ids.length) return;
  try {
    const merged = [...loadSeen(userId), ...ids];
    localStorage.setItem(`${KEY_PREFIX}${userId}`, JSON.stringify(merged.slice(-MAX_REMEMBERED)));
  } catch {
    // Storage może być zablokowany (tryb prywatny); animacja po prostu pokaże się ponownie.
  }
}
