type GarminHrZone = {
  zone?: number;
  seconds?: number;
  secsInZone?: number;
  duration?: number;
}

export interface HealthspanActivityRecord {
  stravaId: number | null;
  garminActivityId: number | null;
  startDate: string;
  sportType: string | null;
  movingTimeSeconds: number | null;
  garminVo2Max: number | null;
  garminHrZones: GarminHrZone[] | null;
  garminAerobicEffect: number | null;
  garminAnaerobicEffect: number | null;
  source: string | null;
}

export interface GarminActivityEvidence {
  source: 'garmin';
  measuredAt: string;
  sourceRecordIds: string[];
  activeZoneMinutes: number | null;
  aerobicEffect: number | null;
  anaerobicEffect: number | null;
  vo2Max: number | null;
}

export interface Vo2Candidate {
  value: number;
  measuredAt: string;
  sourceRecordIds: string[];
}

const timestamp = (value: string) => new Date(value).getTime();
const finite = (value: number | null | undefined): value is number => Number.isFinite(value);
const normalizedSport = (value: string | null) => (value ?? '').toLowerCase().replace(/[^a-z]/g, '');

function isDuplicate(left: HealthspanActivityRecord, right: HealthspanActivityRecord) {
  if (left.garminActivityId != null && left.garminActivityId === right.garminActivityId) return true;
  if (normalizedSport(left.sportType) !== normalizedSport(right.sportType)) return false;
  const timeDifference = Math.abs(timestamp(left.startDate) - timestamp(right.startDate));
  const leftDuration = left.movingTimeSeconds ?? 0;
  const rightDuration = right.movingTimeSeconds ?? 0;
  const durationDifference = Math.abs(leftDuration - rightDuration);
  return timeDifference <= 5 * 60_000
    && durationDifference <= Math.max(60, Math.max(leftDuration, rightDuration) * 0.1);
}

function mergeActivity(
  existing: HealthspanActivityRecord,
  incoming: HealthspanActivityRecord,
): HealthspanActivityRecord {
  const preferred = incoming.source === 'garmin' ? incoming : existing;
  const fallback = preferred === incoming ? existing : incoming;
  return {
    ...fallback,
    ...preferred,
    stravaId: preferred.stravaId ?? fallback.stravaId,
    garminActivityId: preferred.garminActivityId ?? fallback.garminActivityId,
    garminVo2Max: preferred.garminVo2Max ?? fallback.garminVo2Max,
    garminHrZones: preferred.garminHrZones ?? fallback.garminHrZones,
    garminAerobicEffect: preferred.garminAerobicEffect ?? fallback.garminAerobicEffect,
    garminAnaerobicEffect: preferred.garminAnaerobicEffect ?? fallback.garminAnaerobicEffect,
  };
}

export function deduplicateHealthspanActivities(
  activities: HealthspanActivityRecord[],
): HealthspanActivityRecord[] {
  return activities.reduce<HealthspanActivityRecord[]>((result, activity) => {
    const duplicateIndex = result.findIndex((candidate) => isDuplicate(candidate, activity));
    if (duplicateIndex < 0) return [...result, activity];
    const next = [...result];
    next[duplicateIndex] = mergeActivity(next[duplicateIndex], activity);
    return next;
  }, []);
}

export function projectGarminActivityEvidence(
  activity: HealthspanActivityRecord,
): GarminActivityEvidence {
  const zoneSeconds = (activity.garminHrZones ?? []).reduce((sum, zone) => {
    if ((zone.zone ?? 0) < 2 || (zone.zone ?? 0) > 5) return sum;
    const duration = zone.seconds ?? zone.secsInZone ?? zone.duration ?? 0;
    return sum + (finite(duration) ? Math.max(0, duration) : 0);
  }, 0);
  return {
    source: 'garmin',
    measuredAt: activity.startDate.slice(0, 10),
    sourceRecordIds: [
      ...(activity.garminActivityId == null ? [] : [`garmin:${activity.garminActivityId}`]),
      ...(activity.stravaId == null ? [] : [`strava:${activity.stravaId}`]),
    ],
    activeZoneMinutes: zoneSeconds > 0 ? Math.round(zoneSeconds / 60) : null,
    aerobicEffect: activity.garminAerobicEffect,
    anaerobicEffect: activity.garminAnaerobicEffect,
    vo2Max: activity.garminVo2Max,
  };
}

export function selectBestVo2Evidence(input: {
  garmin: Vo2Candidate[];
  oura: Vo2Candidate | null;
}) {
  const garmin = [...input.garmin]
    .filter((item) => finite(item.value))
    .sort((left, right) => right.measuredAt.localeCompare(left.measuredAt))[0];
  if (garmin && (!input.oura || garmin.measuredAt >= input.oura.measuredAt)) {
    return { ...garmin, source: 'garmin' as const, quality: 'device_estimate' as const };
  }
  return input.oura
    ? { ...input.oura, source: 'oura' as const, quality: 'device_estimate' as const }
    : null;
}
