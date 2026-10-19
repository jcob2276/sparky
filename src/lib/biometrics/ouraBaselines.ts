import { shiftDateStr, warsawTimeOfDay } from '../date';

export interface BaselineNight {
  date: string;
  hrv_avg?: number | null;
  rhr_avg?: number | null;
  sleep_efficiency?: number | null;
  latency_minutes?: number | null;
  total_sleep_hours?: number | null;
  deep_sleep_hours?: number | null;
  rem_sleep_hours?: number | null;
  bedtime_timestamp?: string | null;
}

type BaselineKey = 'hrv' | 'rhr' | 'efficiency' | 'latency' | 'bedtime' | 'total' | 'deep' | 'rem';
type BaselineStatus = 'below' | 'within' | 'above' | 'insufficient' | 'no-latest';
/** Colour semantics: only metrics with an unambiguous direction (latency, efficiency) ever leave 'neutral'. */
type BaselineTone = 'neutral' | 'good' | 'attention';

const BASELINE_WINDOW_NIGHTS = 60;
const BASELINE_MIN_NIGHTS = 14;
const BEDTIME_ORIGIN_MIN = 18 * 60;

const STATUS_LABELS: Record<BaselineStatus, string> = {
  below: 'Poniżej normy', within: 'W normie', above: 'Powyżej normy',
  insufficient: 'Za mało danych', 'no-latest': 'Brak pomiaru z ostatniej nocy',
};

interface MetricDef {
  key: BaselineKey;
  label: string;
  unit: string;
  /** Which side is unambiguously better; null = no judgement. */
  better: 'lower' | 'higher' | null;
  read: (night: BaselineNight) => number | null;
  format: (value: number) => string;
}

const pos = (v: number | null | undefined): number | null => (v != null && Number.isFinite(v) && v > 0 ? v : null);
const fmt = (digits: number) => (v: number) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: digits }).format(v);
const share = (part: number | null | undefined, total: number | null | undefined): number | null => {
  const p = pos(part);
  const t = pos(total);
  return p != null && t != null ? Math.round((p / t) * 1000) / 10 : null;
};

/** Minutes since 18:00 so that 23:30 and 01:15 sit on one continuous axis. */
function bedtimeMinutes(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const [h, m] = warsawTimeOfDay(iso).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return ((((h % 24) * 60 + m - BEDTIME_ORIGIN_MIN) % 1440) + 1440) % 1440;
}
function formatBedtime(shifted: number): string {
  const total = Math.round(shifted + BEDTIME_ORIGIN_MIN) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const DEFS: MetricDef[] = [
  { key: 'hrv', label: 'Nocne HRV', unit: 'ms', better: null, read: n => pos(n.hrv_avg), format: fmt(0) },
  { key: 'rhr', label: 'Tętno spoczynkowe', unit: 'bpm', better: null, read: n => pos(n.rhr_avg), format: fmt(1) },
  { key: 'efficiency', label: 'Efektywność snu', unit: '%', better: 'higher', read: n => pos(n.sleep_efficiency), format: fmt(0) },
  { key: 'latency', label: 'Czas zasypiania', unit: 'min', better: 'lower',
    read: n => (n.latency_minutes != null && Number.isFinite(n.latency_minutes) && n.latency_minutes >= 0 ? n.latency_minutes : null),
    format: fmt(0) },
  { key: 'bedtime', label: 'Pora położenia się', unit: '', better: null, read: n => bedtimeMinutes(n.bedtime_timestamp), format: formatBedtime },
  { key: 'total', label: 'Łączny sen', unit: 'h', better: null, read: n => pos(n.total_sleep_hours), format: fmt(1) },
  { key: 'deep', label: 'Sen głęboki', unit: '%', better: null, read: n => share(n.deep_sleep_hours, n.total_sleep_hours), format: fmt(0) },
  { key: 'rem', label: 'Sen REM', unit: '%', better: null, read: n => share(n.rem_sleep_hours, n.total_sleep_hours), format: fmt(0) },
];

export interface BaselineRow {
  key: BaselineKey;
  label: string;
  unit: string;
  latest: number | null;
  latestText: string;
  /** 25th and 75th percentile of the baseline nights. */
  low: number | null;
  high: number | null;
  rangeText: string;
  nights: number;
  needed: number;
  status: BaselineStatus;
  statusLabel: string;
  tone: BaselineTone;
  /** 0–100 positions on the track; null when there is no baseline / no value. */
  rangeStartPct: number | null;
  rangeEndPct: number | null;
  latestPct: number | null;
}

export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

function toneFor(def: MetricDef, status: BaselineStatus): BaselineTone {
  if (!def.better || (status !== 'below' && status !== 'above')) return 'neutral';
  const goodSide = def.better === 'higher' ? 'above' : 'below';
  return status === goodSide ? 'good' : 'attention';
}

const withUnit = (def: MetricDef, text: string) => (def.unit ? `${text} ${def.unit}` : text);

/**
 * Compares the night ending on `asOf` with the user's own typical range (P25-P75) from the
 * previous 60 days. The latest night is excluded from its own baseline.
 */
export function buildBaselineRows(history: BaselineNight[], asOf: string): BaselineRow[] {
  const from = shiftDateStr(asOf, -BASELINE_WINDOW_NIGHTS);
  const baseline = history.filter(n => n.date >= from && n.date < asOf);
  const latestNight = history.find(n => n.date === asOf);

  return DEFS.map((def): BaselineRow => {
    const values = baseline.flatMap(n => { const v = def.read(n); return v == null ? [] : [v]; }).sort((a, b) => a - b);
    const latest = latestNight ? def.read(latestNight) : null;
    const enough = values.length >= BASELINE_MIN_NIGHTS;
    const low = enough ? percentile(values, 0.25) : null;
    const high = enough ? percentile(values, 0.75) : null;
    let status: BaselineStatus = 'within';
    if (latest == null) status = 'no-latest';
    else if (low == null || high == null) status = 'insufficient';
    else if (latest < low) status = 'below';
    else if (latest > high) status = 'above';

    let rangeStartPct: number | null = null;
    let rangeEndPct: number | null = null;
    let latestPct: number | null = null;
    if (low != null && high != null) {
      const lo = Math.min(values[0], latest ?? values[0]);
      const hi = Math.max(values[values.length - 1], latest ?? values[0]);
      const span = hi - lo || 1;
      const pct = (v: number) => Math.round(((v - lo) / span) * 1000) / 10;
      rangeStartPct = pct(low);
      rangeEndPct = pct(high);
      latestPct = latest == null ? null : pct(latest);
    }
    return {
      key: def.key, label: def.label, unit: def.unit, latest, low, high, nights: values.length,
      needed: BASELINE_MIN_NIGHTS, status, statusLabel: STATUS_LABELS[status], tone: toneFor(def, status),
      latestText: latest == null ? '—' : withUnit(def, def.format(latest)),
      rangeText: low == null || high == null ? `${values.length}/${BASELINE_MIN_NIGHTS} nocy z pomiarem`
        : `${def.format(low)}–${withUnit(def, def.format(high))}`,
      rangeStartPct, rangeEndPct, latestPct,
    };
  });
}
