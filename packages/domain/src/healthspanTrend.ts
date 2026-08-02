import type { HealthspanConfounder, HealthspanContributorKey } from './healthspan';

export interface HealthspanTrendSnapshot {
  date: string;
  modelVersion: string;
  coverage: number;
  evidenceStrength: number;
  contributors: Partial<Record<HealthspanContributorKey, number>>;
}

export type HealthspanTrendReason =
  | 'insufficient_history'
  | 'insufficient_same_version_history'
  | 'insufficient_common_domains'
  | 'excessive_gaps';

export interface HealthspanTrend {
  status: 'calibrating' | 'ready';
  direction: 'improving' | 'stable' | 'worsening' | 'unknown';
  multiplier: number | null;
  deltaPer28Days: number | null;
  confidence: number;
  sampleCount: number;
  dateRange: { from: string | null; to: string | null };
  commonDomains: HealthspanContributorKey[];
  confounders: HealthspanConfounder[];
  reasons: HealthspanTrendReason[];
  modelVersion: string | null;
}

const round = (value: number, digits = 0) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const median = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const weekKey = (date: string) => {
  const value = new Date(`${date}T12:00:00Z`);
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - day + 1);
  return value.toISOString().slice(0, 10);
};

function theilSenSlope(values: number[]) {
  const slopes: number[] = [];
  for (let left = 0; left < values.length; left++) {
    for (let right = left + 1; right < values.length; right++) {
      slopes.push((values[right] - values[left]) / (right - left));
    }
  }
  return slopes.length ? median(slopes) : 0;
}

function calibrating(
  snapshots: HealthspanTrendSnapshot[],
  commonDomains: HealthspanContributorKey[],
  confounders: HealthspanConfounder[],
  reasons: HealthspanTrendReason[],
  modelVersion: string | null,
): HealthspanTrend {
  return {
    status: 'calibrating',
    direction: 'unknown',
    multiplier: null,
    deltaPer28Days: null,
    confidence: 0,
    sampleCount: snapshots.length,
    dateRange: {
      from: snapshots[0]?.date ?? null,
      to: snapshots[snapshots.length - 1]?.date ?? null,
    },
    commonDomains,
    confounders,
    reasons,
    modelVersion,
  };
}

export function computeHealthspanTrend(
  input: HealthspanTrendSnapshot[],
  confounders: HealthspanConfounder[],
): HealthspanTrend {
  const ordered = [...input].sort((left, right) => left.date.localeCompare(right.date));
  const latestVersion = ordered[ordered.length - 1]?.modelVersion ?? null;
  const sameVersion = ordered.filter((item) => item.modelVersion === latestVersion);
  const weeks = new Map<string, HealthspanTrendSnapshot[]>();
  for (const snapshot of sameVersion) {
    const key = weekKey(snapshot.date);
    weeks.set(key, [...(weeks.get(key) ?? []), snapshot]);
  }
  const weekly = [...weeks.entries()].sort(([left], [right]) => left.localeCompare(right));
  if (weekly.length < 12) {
    const reason = ordered.length >= 12
      ? 'insufficient_same_version_history'
      : 'insufficient_history';
    return calibrating(sameVersion, [], confounders, [reason], latestVersion);
  }

  const commonDomains = Object.keys(sameVersion[0]?.contributors ?? {}).filter((key) => (
    sameVersion.every((snapshot) => snapshot.contributors[key as HealthspanContributorKey] != null)
  )) as HealthspanContributorKey[];
  if (commonDomains.length < 3) {
    return calibrating(sameVersion, commonDomains, confounders, ['insufficient_common_domains'], latestVersion);
  }

  const weeklyScores = weekly.map(([, snapshots]) => median(snapshots.flatMap((snapshot) => (
    commonDomains.map((key) => snapshot.contributors[key] as number)
  ))));
  const deltaPer28Days = round(theilSenSlope(weeklyScores) * 4, 1);
  const coverage = median(sameVersion.map((item) => item.coverage));
  const evidence = median(sameVersion.map((item) => item.evidenceStrength));
  const sampleFactor = Math.min(1, weekly.length / 16);
  const confidence = round(clamp(
    (coverage * 0.45 + evidence * 0.4 + sampleFactor * 100 * 0.15)
    - confounders.length * 12,
  ));

  return {
    status: 'ready',
    direction: deltaPer28Days > 1 ? 'improving' : deltaPer28Days < -1 ? 'worsening' : 'stable',
    multiplier: round(clamp(1 - deltaPer28Days / 50, 0.5, 1.5), 2),
    deltaPer28Days,
    confidence,
    sampleCount: weekly.length,
    dateRange: { from: weekly[0][0], to: weekly[weekly.length - 1][0] },
    commonDomains,
    confounders,
    reasons: [],
    modelVersion: latestVersion,
  };
}
