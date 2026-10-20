// Body metrics types
export interface BodyMetricRow {
  date?: string | null;
  weight?: number | null;
  waist?: number | null;
  neck?: number | null;
  belly?: number | null;
  hips?: number | null;
  chest?: number | null;
  thigh?: number | null;
  biceps_l?: number | null;
  calf?: number | null;
  body_fat?: number | null;
}

export interface MergedBodySnapshot {
  asOfDate: string | null;
  weight: number | null;
  waist: number | null;
  neck: number | null;
  belly: number | null;
  hips: number | null;
  chest: number | null;
  thigh: number | null;
  biceps_l: number | null;
  calf: number | null;
  body_fat: number | null;
}

const MERGE_KEYS: (keyof Omit<MergedBodySnapshot, 'asOfDate'>)[] = [
  'weight', 'waist', 'neck', 'belly', 'hips', 'chest', 'thigh', 'biceps_l', 'calf', 'body_fat',
];

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function mergeLatestBodyMetrics(rows: BodyMetricRow[]): MergedBodySnapshot | null {
  if (!rows.length) return null;

  const sorted = [...rows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const out: MergedBodySnapshot = {
    asOfDate: sorted[0]?.date ?? null,
    weight: null,
    waist: null,
    neck: null,
    belly: null,
    hips: null,
    chest: null,
    thigh: null,
    biceps_l: null,
    calf: null,
    body_fat: null,
  };

  for (const key of MERGE_KEYS) {
    for (const row of sorted) {
      const v = num(row[key as keyof BodyMetricRow]);
      if (v != null) {
        out[key] = v;
        break;
      }
    }
  }

  return out;
}

export function effectiveWaistForNavy(row: { waist?: number | null; belly?: number | null }): number | null {
  return num(row.belly) ?? num(row.waist);
}

export function navyBodyFatPct(
  waistCm: number,
  neckCm: number,
  heightCm: number,
): number | null {
  const diff = waistCm - neckCm;
  if (diff <= 0 || heightCm <= 0) return null;
  const bf = 495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(heightCm)) - 450;
  if (!Number.isFinite(bf)) return null;
  return Math.max(3, Math.min(50, Math.round(bf * 10) / 10));
}

export function computeBmi(weightKg: number, heightCm: number): number | null {
  if (weightKg <= 0 || heightCm <= 0) return null;
  return Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10;
}
