import { useCallback, useState } from 'react';

const STORAGE_KEY = 'sparky:fast-actions:recent';
const MAX_RECENT = 3;

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

/** Last distinct quick actions the user ran (labels), newest first. Per-device convenience only. */
export function useRecentFastActions() {
  const [recent, setRecent] = useState<string[]>(read);

  const remember = useCallback((label: string) => {
    setRecent((current) => {
      const next = [label, ...current.filter((l) => l !== label)].slice(0, MAX_RECENT);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable: the list just won't persist */
      }
      return next;
    });
  }, []);

  return { recent, remember };
}
