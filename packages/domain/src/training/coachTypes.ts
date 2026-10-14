/** Shared evidence contract; plans and AI estimates never become measured results. */
export type CoachRow = Record<string, unknown>;
export type EvidenceKind = 'measured' | 'self_reported' | 'estimated' | 'derived' | 'declared';
export type SignalState = 'current' | 'historical' | 'missing' | 'failed' | 'provisional';
export interface EvidenceRef {
  table: string;
  id: string;
  observedAt: string;
  kind: EvidenceKind;
}
export interface CoachSignal<T> {
  value: T | null;
  state: SignalState;
  refs: EvidenceRef[];
  error?: string;
}
export const HEALTH_COACH_SOURCES = [
  'workout_sessions', 'strava_activities_clean', 'training_plan_workouts',
  'oura_daily_summary', 'daily_strain', 'daily_nutrition', 'daily_food_entries',
  'nutrition_day_reviews', 'body_metrics', 'nutrition_profile', 'goal_kpis', 'vanguard_preferences',
  'vanguard_stream', 'vanguard_calendar',
] as const;
export type HealthCoachSource = typeof HEALTH_COACH_SOURCES[number];
export interface HealthCoachContext {
  asOf: string;
  localDate: string;
  windowStart: string;
  sources: Record<HealthCoachSource, CoachSignal<CoachRow[]>>;
  coverage: Record<HealthCoachSource, number>;
  queryErrors: string[];
}

export interface GoalProgressReview {
  kpiId: string;
  name: string;
  target: number;
  currentValue: number | null;
  unit: string;
  standard: string;
  status: 'progressing' | 'regressing' | 'stable' | 'unassessed';
  evidenceRefs: EvidenceRef[];
  note: string;
}

export interface WeeklyAdherence {
  plannedSessionsCount: number;
  completedSessionsCount: number;
  skippedSessionsCount: number;
  unrecordedSessionsCount: number;
  cardioKm: number;
  strengthSets: number;
  adherenceRate: number | null;
  note: string;
}

export interface WeeklyDecisionReview {
  decisionId: string;
  date: string;
  type: string;
  summary: string;
  applied: boolean;
}

export interface NextWeekProposal {
  action: 'keep' | 'progress' | 'deload' | 'adjust';
  rationale: string;
  changesSummary: string[];
}

export interface HealthCoachWeeklyReview {
  weekStart: string;
  weekEnd: string;
  goalProgress: GoalProgressReview[];
  adherence: WeeklyAdherence;
  coverage: Record<string, number>;
  decisions: WeeklyDecisionReview[];
  nextWeekProposal: NextWeekProposal;
  assessmentStatus: 'evaluated' | 'insufficient_data';
  summary: string;
}
