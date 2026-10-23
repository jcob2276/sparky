import { getTodayWarsaw, shiftDateStr } from '../date';
import { orcaSelect } from './superinvestorsApi';
import { portfolioQuoteTicker } from './portfolioSyncService';
import { usQuoteSymbol } from './marketSymbol';
import { clampToYearFloor, yearFloor } from './yearFloor';
import type { PortfolioPosition } from './jakubPortfolioStorage';

export const PORTFOLIO_BENCHMARK = 'SPY';

export interface PerfPriceRow { ticker: string; date: string; close_raw: number | null; currency: string | null }
interface PositionPerformance {
  id: string; ticker: string; ytdPct: number | null; dayPct: number | null;
}
export interface PortfolioPerformance {
  ytdPct: number | null; dayPct: number | null; dayPln: number | null;
  benchmarkYtdPct: number | null; alphaPp: number | null;
  /** Udział wartości portfela, dla którego mamy cenę z 1 stycznia i bieżącą. */
  coveragePct: number; baselineDate: string | null; asOf: string | null;
  positions: PositionPerformance[];
}

/** Symbol w `prices_daily`: US bez myślników/slashy, reszta jak w wycenie brokera. */
export function priceSymbol(position: Pick<PortfolioPosition, 'ticker' | 'market'>): string {
  const quote = portfolioQuoteTicker(position);
  return position.market === 'US' ? usQuoteSymbol(quote) : quote;
}

function validRows(rows: PerfPriceRow[], symbol: string): PerfPriceRow[] {
  return rows.filter(r => r.ticker === symbol && r.close_raw != null && r.close_raw > 0 && !!r.currency && /^\d{4}-\d{2}-\d{2}$/.test(r.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}
interface SymbolMove { ytd: number | null; day: number | null; baseDate: string | null; lastDate: string | null }
function symbolMove(baseRows: PerfPriceRow[], latestRows: PerfPriceRow[], symbol: string, today: string): SymbolMove {
  const base = validRows(baseRows, symbol)[0], latest = validRows(latestRows, symbol);
  const last = latest.at(-1), prev = latest.at(-2);
  if (!last || last.date < shiftDateStr(today, -7)) return { ytd: null, day: null, baseDate: null, lastDate: null };
  const ytd = base && base.currency === last.currency ? last.close_raw! / base.close_raw! - 1 : null;
  const day = prev && prev.currency === last.currency ? last.close_raw! / prev.close_raw! - 1 : null;
  return { ytd, day, baseDate: ytd == null ? null : base!.date, lastDate: last.date };
}

/**
 * Zwrot cenowy w walucie notowania (bez FX i dywidend) przy stałym składzie portfela:
 * wartość początkowa pozycji = bieżąca wartość / (1 + zwrot). Pozycje bez cen są pomijane i raportowane w pokryciu.
 */
export function computePortfolioPerformance(
  positions: PortfolioPosition[], baseRows: PerfPriceRow[], latestRows: PerfPriceRow[], today: string = getTodayWarsaw(),
): PortfolioPerformance {
  let ytdNow = 0, ytdStart = 0, dayNow = 0, dayStart = 0, covered = 0, total = 0;
  const baseDates: string[] = [], lastDates: string[] = [];
  const perPosition = positions.map(pos => {
    const move = symbolMove(baseRows, latestRows, priceSymbol(pos), today);
    total += pos.currentValue;
    if (move.ytd != null) {
      ytdNow += pos.currentValue; ytdStart += pos.currentValue / (1 + move.ytd); covered += pos.currentValue;
      baseDates.push(move.baseDate!);
    }
    if (move.day != null) { dayNow += pos.currentValue; dayStart += pos.currentValue / (1 + move.day); }
    if (move.lastDate) lastDates.push(move.lastDate);
    return { id: pos.id, ticker: pos.ticker, ytdPct: move.ytd == null ? null : move.ytd * 100, dayPct: move.day == null ? null : move.day * 100 };
  });
  const bench = symbolMove(baseRows, latestRows, PORTFOLIO_BENCHMARK, today);
  const ytdPct = ytdStart > 0 ? (ytdNow / ytdStart - 1) * 100 : null;
  const benchmarkYtdPct = bench.ytd == null ? null : bench.ytd * 100;
  return {
    ytdPct, benchmarkYtdPct, alphaPp: ytdPct != null && benchmarkYtdPct != null ? ytdPct - benchmarkYtdPct : null,
    dayPct: dayStart > 0 ? (dayNow / dayStart - 1) * 100 : null, dayPln: dayStart > 0 ? dayNow - dayStart : null,
    coveragePct: total > 0 ? covered / total * 100 : 0,
    baselineDate: baseDates.sort().at(-1) ?? null, asOf: lastDates.sort()[0] ?? null, positions: perPosition,
  };
}

/** Dwa wąskie odczyty: pierwsze sesje roku oraz ostatni tydzień (od podłogi roku). */
export async function fetchPortfolioPerformance(positions: PortfolioPosition[]): Promise<PortfolioPerformance> {
  const today = getTodayWarsaw(), floor = yearFloor(today);
  const symbols = [...new Set([...positions.map(priceSymbol), PORTFOLIO_BENCHMARK])];
  const base = `prices_daily?select=ticker,date,close_raw,currency&ticker=in.(${encodeURIComponent(symbols.join(','))})`;
  const [baseRows, latestRows] = await Promise.all([
    orcaSelect<PerfPriceRow>(`${base}&date=gte.${floor}&date=lte.${shiftDateStr(floor, 9)}&order=ticker.asc,date.asc`, { strict: true }),
    orcaSelect<PerfPriceRow>(`${base}&date=gte.${clampToYearFloor(shiftDateStr(today, -7), today)}&date=lte.${today}&order=ticker.asc,date.asc`, { strict: true }),
  ]);
  return computePortfolioPerformance(positions, baseRows, latestRows, today);
}
