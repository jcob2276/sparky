import { fetchWithRetry } from '../_shared/httpClient.ts';

export interface NbpFxTable { date: string; rates: ReadonlyMap<string, number> }

/** Current official mid rates; never substitute invented values after an outage. */
function parseNbpFxTable(input: unknown): NbpFxTable {
  if (!Array.isArray(input) || input.length !== 1) throw new Error('Niepełna tabela walut NBP');
  const table = input[0];
  const date = table?.effectiveDate;
  if (table?.table !== 'A' || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || !Array.isArray(table.rates) || !table.rates.length) throw new Error('Niepoprawny kontrakt NBP');
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date)
    throw new Error('Niepoprawna data NBP');
  const rates = new Map<string, number>([['PLN', 1]]);
  for (const rate of table.rates) {
    if (!rate || typeof rate.code !== 'string' || !/^[A-Z]{3}$/.test(rate.code)
      || typeof rate.mid !== 'number' || !Number.isFinite(rate.mid) || rate.mid <= 0)
      throw new Error('Niepoprawny kurs NBP');
    rates.set(rate.code, rate.mid);
  }
  return { date, rates };
}

export async function fetchGpwFxTable(): Promise<NbpFxTable> {
  const response = await fetchWithRetry('https://api.nbp.pl/api/exchangerates/tables/a/?format=json', {
    headers: { Accept: 'application/json' },
  }, { timeoutMs: 8000, retries: 1, logTag: 'gpwNbp' });
  if (!response.ok) throw new Error(`Kursy NBP: HTTP ${response.status}`);
  return parseNbpFxTable(await response.json());
}

export function convertCurrency(
  amount: number | null, from: unknown, to: unknown, fx?: NbpFxTable,
): number | null {
  if (amount == null || typeof from !== 'string' || typeof to !== 'string'
    || !/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) return null;
  if (from === to) return amount;
  const fromRate = from === 'PLN' ? 1 : fx?.rates.get(from);
  const toRate = to === 'PLN' ? 1 : fx?.rates.get(to);
  return fromRate != null && toRate != null ? amount * fromRate / toRate : null;
}
