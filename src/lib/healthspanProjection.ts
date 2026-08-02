import type { HealthspanEvidence, HealthspanInput } from '@vanguard/domain';
import {
  deduplicateHealthspanActivities,
  projectGarminActivityEvidence,
  selectBestVo2Evidence,
  type HealthspanActivityRecord,
} from './healthspanGarminProjection';

export interface HealthspanOuraRow {
  date: string;
  vo2_max?: number | null;
  rhr_avg?: number | null;
  total_sleep_hours?: number | null;
  steps?: number | null;
  bedtime_start?: string | null;
  stress_high_minutes?: number | null;
  recovery_high_minutes?: number | null;
}

export interface HealthspanActivityRow {
  strava_id?: number | null;
  gc_activity_id?: number | null;
  start_date: string | null;
  gc_vo2max?: number | null;
  gc_hr_zones?: unknown;
  gc_training_effect_aerobic?: number | null;
  gc_training_effect_anaerobic?: number | null;
  moving_time?: number | null;
  sport_type?: string | null;
  source?: string | null;
}

export interface HealthspanStrengthRow {
  date: string;
}

export interface HealthspanBodyRow {
  date: string | null;
  body_fat?: number | null;
}

interface ProjectionInput {
  asOfDate: string;
  chronologicalAge: number;
  sex: 'M' | 'F';
  oura: HealthspanOuraRow[];
  activities: HealthspanActivityRow[];
  strengthSessions: HealthspanStrengthRow[];
  body: HealthspanBodyRow[];
  lifestyle?: HealthspanEvidence | null;
}

export interface HealthspanToday {
  capacity: {
    score: number | null;
    state: 'green' | 'yellow' | 'red' | 'unknown';
    limiter: string | null;
  };
  sleepSupport: {
    score: number | null;
    label: 'mocne wsparcie' | 'stabilne' | 'do poprawy' | 'brak danych';
  };
}

export function deriveHealthspanToday(input: {
  recoveryScore?: number | null;
  dailyStatus?: string | null;
  mainLimiter?: string | null;
  sleepDurationScore?: number | null;
  sleepRegularityScore?: number | null;
}): HealthspanToday {
  const duration = input.sleepDurationScore;
  const regularity = input.sleepRegularityScore;
  const sleepScore = duration != null && regularity != null
    ? Math.round(duration * 0.65 + regularity * 0.35)
    : duration != null ? Math.round(duration)
      : regularity != null ? Math.round(regularity)
        : null;
  return {
    capacity: {
      score: input.recoveryScore == null ? null : Math.round(input.recoveryScore),
      state: input.dailyStatus === 'green' || input.dailyStatus === 'yellow' || input.dailyStatus === 'red'
        ? input.dailyStatus
        : 'unknown',
      limiter: input.mainLimiter ?? null,
    },
    sleepSupport: {
      score: sleepScore,
      label: sleepScore == null
        ? 'brak danych'
        : sleepScore >= 80 ? 'mocne wsparcie'
          : sleepScore >= 70 ? 'stabilne'
            : 'do poprawy',
    },
  };
}

export function mergeOuraHealthspanRows(
  summaries: HealthspanOuraRow[],
  enhanced: HealthspanOuraRow[],
): HealthspanOuraRow[] {
  const byDate = new Map<string, HealthspanOuraRow>();
  for (const row of enhanced) byDate.set(row.date, { ...row });
  for (const row of summaries) byDate.set(row.date, { ...byDate.get(row.date), ...row });
  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

const average = (values: number[]) => (
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
);
const rounded = (value: number, digits = 1) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};
const day = (value: string | null) => value?.slice(0, 10) ?? '';
const daysAgo = (date: string, asOfDate: string) => (
  (new Date(`${asOfDate}T12:00:00Z`).getTime() - new Date(`${date}T12:00:00Z`).getTime()) / 86_400_000
);
const recent = (date: string, asOfDate: string, windowDays: number) => {
  const age = daysAgo(date, asOfDate);
  return age >= 0 && age < windowDays;
};

function aerobicMinutesForActivity(row: HealthspanActivityRecord): number {
  const zoneMinutes = projectGarminActivityEvidence(row).activeZoneMinutes;
  if (zoneMinutes != null) return zoneMinutes;
  const trainingEffect = row.garminAerobicEffect ?? 0;
  const isAerobicSport = /run|ride|cycling|swim|walk|hike|cardio|row/i.test(row.sportType ?? '');
  if (trainingEffect >= 2 || isAerobicSport) return Math.max(0, row.movingTimeSeconds ?? 0) / 60;
  return 0;
}

function evidence(
  value: number | null,
  source: HealthspanEvidence['source'],
  measuredAt: string,
  sampleCount: number,
  quality: HealthspanEvidence['quality'],
): HealthspanEvidence | null {
  if (value == null || !Number.isFinite(value) || sampleCount < 1 || !measuredAt) return null;
  return { value: rounded(value), source, measuredAt, sampleCount, quality };
}

const latestValue = <T>(
  rows: T[],
  getDate: (row: T) => string,
  getValue: (row: T) => number | null | undefined,
) => [...rows]
  .sort((left, right) => getDate(right).localeCompare(getDate(left)))
  .find((row) => Number.isFinite(getValue(row)));

function sleepRegularity(rows: HealthspanOuraRow[]): number | null {
  const minutes = rows.flatMap((row) => {
    if (!row.bedtime_start) return [];
    const date = new Date(row.bedtime_start);
    let minute = date.getUTCHours() * 60 + date.getUTCMinutes();
    if (minute < 12 * 60) minute += 24 * 60;
    return [minute];
  });
  if (minutes.length < 3) return null;
  const mean = average(minutes) ?? 0;
  const deviation = Math.sqrt(average(minutes.map((value) => (value - mean) ** 2)) ?? 0);
  return rounded(Math.max(0, 100 - deviation * 0.8));
}

export function projectHealthspanEvidence(input: ProjectionInput): HealthspanInput {
  const oura = input.oura.filter((row) => recent(row.date, input.asOfDate, 30));
  const activities = deduplicateHealthspanActivities(input.activities.flatMap((row) => (
    row.start_date ? [{
      stravaId: row.strava_id ?? null,
      garminActivityId: row.gc_activity_id ?? null,
      startDate: row.start_date,
      sportType: row.sport_type ?? null,
      movingTimeSeconds: row.moving_time ?? null,
      garminVo2Max: row.gc_vo2max ?? null,
      garminHrZones: Array.isArray(row.gc_hr_zones) ? row.gc_hr_zones : null,
      garminAerobicEffect: row.gc_training_effect_aerobic ?? null,
      garminAnaerobicEffect: row.gc_training_effect_anaerobic ?? null,
      source: row.source ?? null,
    } as HealthspanActivityRecord] : []
  ))).filter((row) => recent(day(row.startDate), input.asOfDate, 45));
  const latestOuraVo2 = latestValue(oura, (row) => row.date, (row) => row.vo2_max);
  const selectedVo2Candidate = selectBestVo2Evidence({
    garmin: activities.flatMap((row) => row.garminVo2Max == null ? [] : [{
      value: row.garminVo2Max,
      measuredAt: day(row.startDate),
      sourceRecordIds: projectGarminActivityEvidence(row).sourceRecordIds,
    }]),
    oura: latestOuraVo2?.vo2_max == null ? null : {
      value: latestOuraVo2.vo2_max,
      measuredAt: latestOuraVo2.date,
      sourceRecordIds: [`oura:${latestOuraVo2.date}`],
    },
  });
  const selectedVo2 = selectedVo2Candidate
    ? evidence(
      selectedVo2Candidate.value,
      selectedVo2Candidate.source,
      selectedVo2Candidate.measuredAt,
      selectedVo2Candidate.source === 'garmin'
        ? activities.filter((row) => row.garminVo2Max != null).length
        : 1,
      selectedVo2Candidate.quality,
    )
    : null;

  const sevenDayActivities = activities.filter((row) => recent(day(row.startDate), input.asOfDate, 7));
  const aerobicMinutes = sevenDayActivities.reduce(
    (sum, row) => sum + aerobicMinutesForActivity(row),
    0,
  );
  const rhrValues = oura.flatMap((row) => row.rhr_avg == null ? [] : [row.rhr_avg]);
  const sleepValues = oura.flatMap((row) => row.total_sleep_hours == null ? [] : [row.total_sleep_hours]);
  const stepValues = oura.flatMap((row) => row.steps == null ? [] : [row.steps]);
  const stressRows = oura.filter((row) => (
    row.stress_high_minutes != null || row.recovery_high_minutes != null
  ));
  const stressBalance = average(stressRows.map((row) => {
    const stress = Math.max(0, row.stress_high_minutes ?? 0);
    const recovery = Math.max(0, row.recovery_high_minutes ?? 0);
    return stress + recovery > 0 ? recovery / (stress + recovery) * 100 : 50;
  }));
  const strengthDates = new Set(
    input.strengthSessions
      .filter((row) => recent(row.date, input.asOfDate, 7))
      .map((row) => row.date),
  );
  const latestBody = latestValue(input.body, (row) => row.date ?? '', (row) => row.body_fat);
  const latestOuraDate = oura.map((row) => row.date).sort().pop() ?? '';

  return {
    asOfDate: input.asOfDate,
    chronologicalAge: input.chronologicalAge,
    sex: input.sex,
    vo2Max: selectedVo2,
    restingHeartRate: evidence(average(rhrValues), 'oura', latestOuraDate, rhrValues.length, 'measured'),
    sleepDurationHours: evidence(average(sleepValues), 'oura', latestOuraDate, sleepValues.length, 'measured'),
    sleepRegularity: evidence(sleepRegularity(oura), 'oura', latestOuraDate, oura.filter((row) => row.bedtime_start).length, 'derived'),
    stepsDaily: evidence(average(stepValues), 'oura', latestOuraDate, stepValues.length, 'measured'),
    moderateVigorousMinutesWeekly: evidence(
      aerobicMinutes || null,
      'garmin',
      sevenDayActivities.map((row) => day(row.startDate)).sort().pop() ?? '',
      sevenDayActivities.length,
      'derived',
    ),
    strengthDaysWeekly: evidence(
      strengthDates.size || null,
      'sparky',
      [...strengthDates].sort().pop() ?? '',
      strengthDates.size,
      'logged',
    ),
    bodyComposition: latestBody
      ? evidence(latestBody.body_fat ?? null, 'sparky', latestBody.date ?? '', 1, 'device_estimate')
      : null,
    stressRecoveryBalance: evidence(stressBalance, 'oura', latestOuraDate, stressRows.length, 'derived'),
    lifestyle: input.lifestyle ?? null,
  };
}
