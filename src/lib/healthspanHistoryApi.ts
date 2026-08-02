import type {
  HealthspanContributorKey,
  HealthspanTrendSnapshot,
} from '@vanguard/domain';
import { shiftDateStr } from './date';
import { supabase } from './supabase';
import type { Json } from './database.types';

export type HealthspanHistoryRange = '12w' | '6m' | '1y';

export interface HealthspanSnapshotRow {
  snapshot_date: string;
  model_version: string;
  profile: Json | Record<string, unknown>;
}

export interface HealthspanHistoryPoint {
  date: string;
  score: number;
  estimatedAge: number | null;
  ageLow?: number | null;
  ageHigh?: number | null;
  confidence?: number;
  coverage: number;
  modelVersion: string;
}

export interface HealthspanHistory {
  points: HealthspanHistoryPoint[];
  series: Array<{ modelVersion: string; points: HealthspanHistoryPoint[] }>;
  trendSnapshots: HealthspanTrendSnapshot[];
}

const rangeDays: Record<HealthspanHistoryRange, number> = {
  '12w': 84,
  '6m': 183,
  '1y': 365,
};

const object = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
);

const number = (value: unknown, fallback = 0) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

export function buildHealthspanHistory(
  rows: HealthspanSnapshotRow[],
  today: string,
  range: HealthspanHistoryRange,
): HealthspanHistory {
  const since = shiftDateStr(today, -rangeDays[range]);
  const selected = rows
    .filter((row) => row.snapshot_date >= since && row.snapshot_date <= today)
    .sort((left, right) => left.snapshot_date.localeCompare(right.snapshot_date));
  const points: HealthspanHistoryPoint[] = [];
  const trendSnapshots: HealthspanTrendSnapshot[] = [];

  for (const row of selected) {
    const profile = object(row.profile);
    const confidence = object(profile.confidence);
    const ageRange = object(profile.ageRange);
    const contributors = Array.isArray(profile.contributors) ? profile.contributors : [];
    const contributorScores: Partial<Record<HealthspanContributorKey, number>> = {};
    for (const rawContributor of contributors) {
      const contributor = object(rawContributor);
      if (typeof contributor.key === 'string' && typeof contributor.score === 'number') {
        contributorScores[contributor.key as HealthspanContributorKey] = contributor.score;
      }
    }
    points.push({
      date: row.snapshot_date,
      score: number(profile.score),
      estimatedAge: typeof profile.estimatedAge === 'number' ? profile.estimatedAge : null,
      ageLow: typeof ageRange.low === 'number' ? ageRange.low : null,
      ageHigh: typeof ageRange.high === 'number' ? ageRange.high : null,
      confidence: number(confidence.overall),
      coverage: number(confidence.coverage),
      modelVersion: row.model_version,
    });
    trendSnapshots.push({
      date: row.snapshot_date,
      modelVersion: row.model_version,
      coverage: number(confidence.coverage),
      evidenceStrength: number(confidence.evidenceStrength),
      contributors: contributorScores,
    });
  }

  const versions = new Map<string, HealthspanHistoryPoint[]>();
  for (const point of points) {
    versions.set(point.modelVersion, [...(versions.get(point.modelVersion) ?? []), point]);
  }
  return {
    points,
    trendSnapshots,
    series: [...versions].map(([modelVersion, versionPoints]) => ({
      modelVersion,
      points: versionPoints,
    })),
  };
}

export async function fetchHealthspanHistory(
  userId: string,
  today: string,
  range: HealthspanHistoryRange = '1y',
) {
  const { data, error } = await supabase
    .from('healthspan_snapshots')
    .select('snapshot_date, model_version, profile')
    .eq('user_id', userId)
    .gte('snapshot_date', shiftDateStr(today, -rangeDays[range]))
    .lte('snapshot_date', today)
    .order('snapshot_date');
  if (error) throw error;
  return buildHealthspanHistory((data ?? []) as HealthspanSnapshotRow[], today, range);
}
