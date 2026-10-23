import { currentYear } from '../../lib/investments/yearFloor';

interface AnalystChartBar {
  label: string;
  value: number;
  /** Marża netto w % — wyświetlana nad słupkiem. */
  margin: number | null;
}

export interface AnalystChartSpec {
  title: string;
  unit: string;
  source: string;
  asOf: string;
  bars: AnalystChartBar[];
  /** Ile słupków odrzucono, bo wypadały poza bieżący rok. */
  droppedOutOfYear: number;
}

const YEAR_IN_LABEL = /(?:^|\D)(20\d{2})(?!\d)/;
const SHORT_YEAR_QUARTER = /[1-4]\s*Q\s*'?(\d{2})\b|Q[1-4]\s*'?(\d{2})\b/i;

/** Rok z etykiety kwartału ("Q1 2026", "2026 Q1", "1Q26"); null gdy etykieta nie niesie roku. */
export function labelYear(label: string): number | null {
  const full = label.match(YEAR_IN_LABEL);
  if (full) return Number(full[1]);
  const short = label.match(SHORT_YEAR_QUARTER);
  const yy = short?.[1] ?? short?.[2];
  return yy ? 2000 + Number(yy) : null;
}

function num(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Parsuje JSON wykresu z odpowiedzi modelu i ucina słupki spoza bieżącego roku. */
export function parseChartSpec(raw: string, year: number = currentYear()): AnalystChartSpec | null {
  let data: unknown;
  try {
    data = JSON.parse(raw.trim());
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const rec = data as Record<string, unknown>;
  if (!Array.isArray(rec.bars)) return null;

  const bars: AnalystChartBar[] = [];
  let dropped = 0;
  for (const item of rec.bars) {
    if (!item || typeof item !== 'object') continue;
    const b = item as Record<string, unknown>;
    const label = str(b.label);
    const value = num(b.value);
    if (!label || value === null) continue;
    const y = labelYear(label);
    if (y !== null && y !== year) {
      dropped++;
      continue;
    }
    bars.push({ label, value, margin: num(b.margin) });
  }
  if (bars.length === 0) return null;
  return {
    title: str(rec.title),
    unit: str(rec.unit),
    source: str(rec.source),
    asOf: str(rec.asOf),
    bars,
    droppedOutOfYear: dropped,
  };
}
