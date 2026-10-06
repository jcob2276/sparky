/** Yahoo identifies US share classes with a dash; SEC mappings may use a slash. */
export function usQuoteSymbol(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/\.US$/, '').replace(/[/.]/g, '-');
}
