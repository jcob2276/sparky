/** Yahoo identifies US share classes with a dash; SEC mappings may use a slash. */
export function usQuoteSymbol(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/\.US$/, '').replace(/[/.]/g, '-');
}

/** Bare keys are legacy entries; explicit suffixes restrict matches to their market. */
export function watchlistTickersForMarket(watchlist: string[], market: 'USA' | 'GPW'): Set<string> {
  return new Set(watchlist.map(ticker => ticker.trim().toUpperCase())
    .filter(ticker => market === 'USA' ? !/\.(WA|PL)$/.test(ticker) : !ticker.endsWith('.US'))
    .map(ticker => ticker.replace(/\.(WA|PL|US)$/, '')));
}
