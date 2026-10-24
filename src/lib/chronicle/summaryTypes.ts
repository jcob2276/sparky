export type ChronicleGoal = 'cialo' | 'duch' | 'konto';

type ChronicleTone = 'good' | 'bad' | 'neutral';

export interface ChronicleTile {
  label: string;
  value: string;
  /** Zmiana względem poprzedniego okresu tej samej długości; null, gdy brakuje danych do porównania. */
  delta: string | null;
  tone: ChronicleTone;
  hint?: string;
  /** Nagłówek sekcji w obrębie celu (np. Sen, Jedzenie); kafelki bez grupy idą jednym blokiem. */
  group?: string;
}

interface ChronicleChart {
  label: string;
  unit: string;
  labels: string[];
  /** null = brak danych w kubełku (przerwa na wykresie, nie zero). */
  values: Array<number | null>;
}

export interface ChronicleSummaryData {
  goalLine: { title: string; hint: string; pct: number | null };
  tiles: ChronicleTile[];
  chart: ChronicleChart;
  notes: string[];
}

export const GOAL_LABELS: Record<ChronicleGoal, string> = {
  cialo: 'Ciało',
  duch: 'Duch',
  konto: 'Konto',
};

const nf = (value: number, digits: number) =>
  value.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function formatValue(value: number | null, digits = 0, unit = ''): string {
  return value == null ? '—' : `${nf(value, digits)}${unit}`;
}

/** Kafelek z wartością i zmianą; `higherIsBetter` null oznacza, że kierunek nie ma wartości oceny. */
export function makeTile(input: {
  label: string;
  current: number | null;
  previous: number | null;
  digits?: number;
  unit?: string;
  higherIsBetter: boolean | null;
  hint?: string;
  group?: string;
}): ChronicleTile {
  const { label, current, previous, digits = 0, unit = '', higherIsBetter, hint, group } = input;
  const diff = current == null || previous == null ? null : current - previous;
  const rounded = diff == null ? null : Math.round(diff * 10 ** digits) / 10 ** digits;
  const tone: ChronicleTone =
    rounded == null || rounded === 0 || higherIsBetter == null ? 'neutral' : (rounded > 0) === higherIsBetter ? 'good' : 'bad';
  const sign = rounded == null ? '' : rounded > 0 ? '+' : rounded < 0 ? '−' : '±';
  return {
    label,
    value: formatValue(current, digits, unit),
    delta: rounded == null ? null : `${sign}${nf(Math.abs(rounded), digits)}${unit}`,
    tone,
    hint,
    ...(group ? { group } : {}),
  };
}
