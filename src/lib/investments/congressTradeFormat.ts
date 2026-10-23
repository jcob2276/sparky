/**
 * congressTradeFormat.ts — wspólne helpery formatowania ujawnień STOCK Act
 * (widełki kwot, opóźnienie zgłoszenia, typ transakcji, daty po polsku).
 */

export type CongressTradeType = 'buy' | 'sell' | 'exchange' | 'other';

export function classifyTradeType(raw?: string | null): CongressTradeType {
  const value = (raw || '').toLowerCase().trim();
  if (/^(buy|purchase|p)$/.test(value)) return 'buy';
  if (/^(sell|sale|s)\b/.test(value)) return 'sell';
  if (/^(exchange|e)$/.test(value)) return 'exchange';
  return 'other';
}

/** Dni między transakcją a ujawnieniem; null gdy brakuje daty albo kolejność jest odwrócona. */
export function daysBetween(from?: string | null, to?: string | null): number | null {
  if (!from || !to) return null;
  const d1 = new Date(from).getTime();
  const d2 = new Date(to).getTime();
  if (Number.isNaN(d1) || Number.isNaN(d2) || d2 < d1) return null;
  return Math.round((d2 - d1) / 86_400_000);
}

export function formatUsdShort(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1).replace('.', ',')} mln USD`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1).replace('.', ',')} tys USD`;
  return `${Math.round(value)} USD`;
}

/** Widełki kwot wprost z ujawnienia ("1,0 tys USD - 15,0 tys USD"). */
export function formatAmountRange(low?: number | null, high?: number | null): string {
  const l = low || 0;
  const h = high || 0;
  if (l > 0 && h > 0) return `${formatUsdShort(l)} - ${formatUsdShort(h)}`;
  if (h > 0) return formatUsdShort(h);
  if (l > 0) return `od ${formatUsdShort(l)}`;
  return '—';
}

/** YYYY-MM-DD -> DD.MM.RRRR; pusta lub niepoprawna data -> '—'. */
export function formatDatePl(iso?: string | null): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return match ? `${match[3]}.${match[2]}.${match[1]}` : '—';
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** STOCK Act wymaga zgłoszenia transakcji w ciągu 45 dni. */
export const STOCK_ACT_DEADLINE_DAYS = 45;
