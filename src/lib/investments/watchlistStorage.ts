const LS_KEY = 'sparky_investments_watchlist';
const SEEDED_LISTS = new Set(['AMZN,NVDA', 'AMZN,NVDA,DNP,CDR']);

export function loadStoredWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const tickers = parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    if (SEEDED_LISTS.has(tickers.join(','))) {
      localStorage.setItem(LS_KEY, '[]');
      return [];
    }
    return tickers;
  } catch {
    return [];
  }
}

export function saveStoredWatchlist(tickers: string[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(tickers));
  } catch {
    /* prywatny tryb przeglądarki */
  }
}
