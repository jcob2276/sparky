export const US_CATALOGUE_SOURCE = 'https://www.sec.gov/files/company_tickers_exchange.json';

export interface UsCatalogueRow { cik: string; name: string; ticker: string; exchange: string | null }

/** SEC identifiers are discovery data, not proof that an instrument is currently tradable. */
export function parseUsCatalogue(input: unknown): UsCatalogueRow[] {
  const value = input as { fields?: unknown; data?: unknown } | null;
  if (JSON.stringify(value?.fields) !== JSON.stringify(['cik', 'name', 'ticker', 'exchange'])
    || !Array.isArray(value?.data) || !value.data.length) throw new Error('Invalid SEC catalogue contract');
  const seen = new Set<string>();
  return value.data.map((row: unknown) => {
    if (!Array.isArray(row) || row.length !== 4) throw new Error('Invalid SEC catalogue row');
    const [cik, name, ticker, exchange] = row;
    if (!Number.isSafeInteger(cik) || cik <= 0 || cik > 9999999999
      || typeof name !== 'string' || !name.trim() || name.length > 500
      || typeof ticker !== 'string' || !/^[A-Z0-9][A-Z0-9.-]{0,24}$/.test(ticker)
      || (exchange !== null && (typeof exchange !== 'string' || !exchange.trim() || exchange.length > 100))
      || seen.has(ticker)) throw new Error('Invalid or duplicate SEC catalogue identifier');
    seen.add(ticker);
    return { cik: String(cik).padStart(10, '0'), name: name.trim(), ticker, exchange };
  });
}
