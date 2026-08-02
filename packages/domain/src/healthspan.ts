import {
  HEALTHSPAN_METHODOLOGY,
  HEALTHSPAN_MODEL_VERSION,
  scoreContributorValue,
} from './healthspanMethodology.ts';

export type HealthspanSource = 'oura' | 'garmin' | 'sparky' | 'manual';
export type EvidenceQuality = 'measured' | 'lab' | 'device_estimate' | 'derived' | 'logged';
export type HealthspanContributorKey =
  | 'cardio_fitness'
  | 'resting_heart_rate'
  | 'sleep_duration'
  | 'sleep_regularity'
  | 'daily_movement'
  | 'aerobic_activity'
  | 'strength'
  | 'body_composition'
  | 'stress_recovery'
  | 'lifestyle'
  | 'social_connection';

export interface HealthspanEvidence {
  value: number;
  source: HealthspanSource;
  measuredAt: string;
  sampleCount: number;
  quality: EvidenceQuality;
}

export interface HealthspanInput {
  asOfDate: string;
  chronologicalAge: number;
  sex: 'M' | 'F';
  vo2Max: HealthspanEvidence | null;
  restingHeartRate: HealthspanEvidence | null;
  sleepDurationHours: HealthspanEvidence | null;
  sleepRegularity: HealthspanEvidence | null;
  stepsDaily: HealthspanEvidence | null;
  moderateVigorousMinutesWeekly: HealthspanEvidence | null;
  strengthDaysWeekly: HealthspanEvidence | null;
  bodyComposition: HealthspanEvidence | null;
  stressRecoveryBalance: HealthspanEvidence | null;
  lifestyle: HealthspanEvidence | null;
  socialConnection?: HealthspanEvidence | null;
}

export interface HealthspanContributor {
  key: HealthspanContributorKey;
  label: string;
  score: number;
  direction: 'positive' | 'neutral' | 'opportunity';
  ageImpactYears: number;
  value: number;
  benchmark: string;
  source: HealthspanSource;
  measuredAt: string;
  sampleCount: number;
  confidence: number;
  quality: EvidenceQuality;
}

export interface FunctionalAgeProfile {
  asOfDate: string;
  chronologicalAge: number;
  estimatedAge: number;
  ageRange: { low: number; high: number };
  score: number;
  modelVersion: typeof HEALTHSPAN_MODEL_VERSION;
  confidence: {
    overall: number;
    coverage: number;
    evidenceStrength: number;
    stage: 'calibrating' | 'building' | 'established';
  };
  contributors: HealthspanContributor[];
}

export type HealthspanConfounder = 'illness' | 'travel' | 'alcohol' | 'unusual_training';

export interface HealthspanPace {
  status?: 'calibrating' | 'ready';
  multiplier: number | null;
  direction: 'improving' | 'stable' | 'worsening' | 'unknown';
  confidence: number;
  recentScore?: number;
  baselineScore?: number;
  confounders: HealthspanConfounder[];
}

const clamp = (value: number, low = 0, high = 100) => Math.max(low, Math.min(high, value));
const round = (value: number, digits = 0) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};
const daysBetween = (from: string, to: string) => Math.abs(
  (new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000,
);
const average = (values: number[]) => (
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
);

const qualityStrength: Record<EvidenceQuality, number> = {
  measured: 100,
  lab: 100,
  device_estimate: 80,
  derived: 75,
  logged: 65,
};

interface ContributorRule {
  key: HealthspanContributorKey;
  input: keyof HealthspanInput;
}

const rules: ContributorRule[] = [
  { key: 'cardio_fitness', input: 'vo2Max' },
  { key: 'resting_heart_rate', input: 'restingHeartRate' },
  { key: 'sleep_duration', input: 'sleepDurationHours' },
  { key: 'sleep_regularity', input: 'sleepRegularity' },
  { key: 'daily_movement', input: 'stepsDaily' },
  { key: 'aerobic_activity', input: 'moderateVigorousMinutesWeekly' },
  { key: 'strength', input: 'strengthDaysWeekly' },
  { key: 'body_composition', input: 'bodyComposition' },
  { key: 'stress_recovery', input: 'stressRecoveryBalance' },
  { key: 'lifestyle', input: 'lifestyle' },
  { key: 'social_connection', input: 'socialConnection' },
];

export function scoreHealthspanContributors(input: HealthspanInput): HealthspanContributor[] {
  return rules.flatMap((rule) => {
    const methodology = HEALTHSPAN_METHODOLOGY[rule.key];
    const evidence = input[rule.input] as HealthspanEvidence | null;
    if (!evidence || evidence.sampleCount < methodology.minimumSamples || !Number.isFinite(evidence.value)) return [];
    if (daysBetween(evidence.measuredAt, input.asOfDate) > methodology.staleAfterDays) return [];
    const score = round(scoreContributorValue(rule.key, evidence.value, {
      age: input.chronologicalAge,
      sex: input.sex,
    }));
    const confidence = round(
      qualityStrength[evidence.quality] * Math.min(1, evidence.sampleCount / 14),
    );
    const maxImpact = methodology.maxAgeImpactYears;
    const impact = round(clamp(((50 - score) / 50) * maxImpact, -maxImpact, maxImpact), 1);
    return [{
      key: rule.key,
      label: methodology.label,
      score,
      direction: score >= 65 ? 'positive' as const : score >= 45 ? 'neutral' as const : 'opportunity' as const,
      ageImpactYears: impact,
      value: evidence.value,
      benchmark: methodology.benchmark,
      source: evidence.source,
      measuredAt: evidence.measuredAt,
      sampleCount: evidence.sampleCount,
      confidence,
      quality: evidence.quality,
    }];
  });
}

export function computeFunctionalAge(input: HealthspanInput): FunctionalAgeProfile {
  const contributors = scoreHealthspanContributors(input);
  const availableKeys = new Set(contributors.map((item) => item.key));
  const totalWeight = rules.reduce((sum, rule) => sum + HEALTHSPAN_METHODOLOGY[rule.key].weight, 0);
  const availableWeight = rules
    .filter((rule) => availableKeys.has(rule.key))
    .reduce((sum, rule) => sum + HEALTHSPAN_METHODOLOGY[rule.key].weight, 0);
  const weightedScore = contributors.reduce((sum, item) => {
    const weight = HEALTHSPAN_METHODOLOGY[item.key].weight;
    return sum + item.score * weight;
  }, 0);
  const coverage = round((availableWeight / totalWeight) * 100);
  const score = round(availableWeight ? weightedScore / availableWeight : 0);
  const evidenceStrength = round(average(contributors.map((item) => item.confidence)));
  const overall = round(coverage * 0.55 + evidenceStrength * 0.45);
  const totalImpact = clamp(
    contributors.reduce((sum, item) => sum + item.ageImpactYears, 0),
    -12,
    12,
  );
  const estimatedAge = round(clamp(input.chronologicalAge + totalImpact, 18, 90), 1);
  const halfWidth = round(2 + (100 - overall) * 0.08, 1);

  return {
    asOfDate: input.asOfDate,
    chronologicalAge: input.chronologicalAge,
    estimatedAge,
    ageRange: {
      low: round(clamp(estimatedAge - halfWidth, 18, 90), 1),
      high: round(clamp(estimatedAge + halfWidth, 18, 90), 1),
    },
    score,
    modelVersion: HEALTHSPAN_MODEL_VERSION,
    confidence: {
      overall,
      coverage,
      evidenceStrength,
      stage: overall >= 75 ? 'established' : overall >= 45 ? 'building' : 'calibrating',
    },
    contributors,
  };
}
