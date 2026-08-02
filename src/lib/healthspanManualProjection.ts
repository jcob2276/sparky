import type { HealthspanEvidence, HealthspanInput } from '@vanguard/domain';
import type { Json } from './database.types';
import type { HealthspanCheckinPayload } from './healthspanCheckinsApi';

interface CheckinRow {
  checkin_date: string;
  payload: Json;
}

interface BehaviorRow {
  date: string;
  behavior_key: string;
  value: string | number | null;
}

type ManualEvidence = Partial<Pick<
  HealthspanInput,
  | 'vo2Max'
  | 'restingHeartRate'
  | 'sleepDurationHours'
  | 'sleepRegularity'
  | 'stepsDaily'
  | 'moderateVigorousMinutesWeekly'
  | 'strengthDaysWeekly'
  | 'bodyComposition'
  | 'stressRecoveryBalance'
  | 'lifestyle'
  | 'socialConnection'
>>;

const average = (values: number[]) => (
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
);

export function projectManualHealthspanEvidence(
  checkins: CheckinRow[],
  behaviors: BehaviorRow[],
): ManualEvidence {
  const rows = checkins.map((row) => ({
    date: row.checkin_date,
    payload: row.payload as HealthspanCheckinPayload,
  }));
  const latest = (key: keyof HealthspanCheckinPayload) => {
    const row = [...rows].reverse().find((item) => Number.isFinite(Number(item.payload[key])));
    return row ? { value: Number(row.payload[key]), date: row.date } : null;
  };
  const evidence = (
    key: keyof HealthspanCheckinPayload,
    value = latest(key),
  ): HealthspanEvidence | null => value ? ({
    value: value.value,
    source: 'manual',
    measuredAt: value.date,
    sampleCount: rows.filter((item) => Number.isFinite(Number(item.payload[key]))).length,
    quality: 'logged',
  }) : null;

  const diet = latest('dietQuality');
  const alcohol = latest('alcoholUnits');
  const social = latest('socialConnection');
  const behaviorAlcohol = behaviors
    .filter((row) => /alcohol|alkohol/i.test(row.behavior_key) && Number.isFinite(Number(row.value)));
  const behaviorAlcoholAverage = average(behaviorAlcohol.map((row) => Number(row.value)));
  const lifestyleValues = [
    diet?.value,
    alcohol ? Math.max(0, 100 - alcohol.value * 20) : null,
    alcohol == null && behaviorAlcoholAverage != null
      ? Math.max(0, 100 - behaviorAlcoholAverage * 20)
      : null,
  ].filter((value): value is number => value != null);
  const lifestyle = average(lifestyleValues);
  const latestDate = rows.map((row) => row.date).sort().pop()
    ?? behaviorAlcohol.map((row) => row.date).sort().pop()
    ?? '';
  const stress = latest('stress');

  return {
    vo2Max: evidence('vo2Max'),
    restingHeartRate: evidence('restingHeartRate'),
    sleepDurationHours: evidence('sleepHours'),
    sleepRegularity: evidence('sleepConsistency'),
    stepsDaily: evidence('steps'),
    moderateVigorousMinutesWeekly: evidence('movementMinutes'),
    strengthDaysWeekly: evidence('strengthSessions'),
    bodyComposition: evidence('bodyFat'),
    stressRecoveryBalance: evidence('recovery')
      ?? evidence('stress', stress ? { value: 100 - stress.value, date: stress.date } : null),
    lifestyle: lifestyle == null ? null : {
      value: lifestyle,
      source: 'manual',
      measuredAt: latestDate,
      sampleCount: Math.max(1, lifestyleValues.length),
      quality: 'logged',
    },
    socialConnection: social ? {
      value: social.value,
      source: 'manual',
      measuredAt: social.date,
      sampleCount: rows.filter((item) => item.payload.socialConnection != null).length,
      quality: 'logged',
    } : null,
  };
}
