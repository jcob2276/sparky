import { buildHealthDirection } from './healthDirection';

export type ScoreBand = 'optimal' | 'good' | 'fair' | 'attention';
type RingKey = 'sleep' | 'recovery' | 'strain';
type RingTrend = 'up' | 'down' | 'flat' | 'unknown';

const BAND_LABELS: Record<ScoreBand, string> = {
  optimal: 'Optymalny', good: 'Dobry', fair: 'Średni', attention: 'Uwaga',
};
/** Oura bands: Optimal 85-100, Good 70-84, Fair 60-69, Pay attention 0-59. */
export function bandForScore(score: number): ScoreBand {
  if (score >= 85) return 'optimal';
  if (score >= 70) return 'good';
  if (score >= 60) return 'fair';
  return 'attention';
}

const STRAIN_MAX = 21;

export interface RingModel {
  key: RingKey;
  label: string;
  value: number | null;
  /** Display text of the centre number, e.g. "74" or "12,4". */
  valueText: string;
  max: number;
  fraction: number;
  band: ScoreBand | null;
  bandLabel: string;
  trend: RingTrend;
  /** Latest minus the 7-day average (the average includes the latest night). */
  delta: number | null;
  deltaText: string;
  ariaLabel: string;
}

interface RingInput {
  asOf: string;
  summaries?: Parameters<typeof buildHealthDirection>[0]['summaries'];
  enhanced?: Parameters<typeof buildHealthDirection>[0]['enhanced'];
  strainScore?: number | null;
}

const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });

function trendOf(delta: number | null): RingTrend {
  if (delta == null) return 'unknown';
  return Math.abs(delta) < 1 ? 'flat' : delta > 0 ? 'up' : 'down';
}

function buildRing(key: RingKey, label: string, value: number | null, max: number,
  delta: number | null, banded: boolean): RingModel {
  const band = banded && value != null ? bandForScore(value) : null;
  const bandLabel = band ? BAND_LABELS[band] : value == null ? 'Brak danych' : 'Obciążenie';
  const trend = trendOf(delta);
  const deltaText = delta == null ? (value == null || key === 'strain' ? '' : 'Za mało danych do porównania')
    : trend === 'flat' ? 'Jak średnia z 7 dni'
      : `${delta > 0 ? '+' : ''}${number.format(delta)} vs średnia z 7 dni`;
  const valueText = value == null ? '—' : number.format(value);
  const ariaLabel = value == null ? `${label}: brak pomiaru`
    : `${label}: ${valueText} na ${max}, ${bandLabel}${deltaText ? `. ${deltaText}` : ''}`;
  return {
    key, label, value, valueText, max, band, bandLabel, trend, delta, deltaText, ariaLabel,
    fraction: value == null ? 0 : Math.min(1, Math.max(0, value / max)),
  };
}

/** Sleep, recovery and (when computed) strain rings; the 7-day comparison reuses buildHealthDirection. */
export function buildScoreRings({ asOf, summaries, enhanced, strainScore }: RingInput): RingModel[] {
  const { metrics } = buildHealthDirection({ asOf, summaries, enhanced });
  const metric = (key: 'sleep' | 'recovery') => metrics.find(m => m.key === key);
  const delta = (key: 'sleep' | 'recovery'): number | null => {
    const m = metric(key);
    if (!m || m.latest == null || m.current == null || m.currentCount < 4) return null;
    return Math.round((m.latest - m.current) * 10) / 10 || 0;
  };
  const rings = [
    buildRing('sleep', 'Sen', metric('sleep')?.latest ?? null, 100, delta('sleep'), true),
    buildRing('recovery', 'Regeneracja', metric('recovery')?.latest ?? null, 100, delta('recovery'), true),
  ];
  if (strainScore != null && Number.isFinite(strainScore)) {
    rings.push(buildRing('strain', 'Obciążenie', strainScore, STRAIN_MAX, null, false));
  }
  return rings;
}
