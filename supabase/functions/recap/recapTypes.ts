export interface DailyWinsRow {
  task_1?: string | null;
  task_2?: string | null;
  task_3?: string | null;
  task_4?: string | null;
  task_5?: string | null;
  done_1?: boolean | null;
  done_2?: boolean | null;
  done_3?: boolean | null;
  done_4?: boolean | null;
  done_5?: boolean | null;
  day_note?: string | null;
  result?: string | null;
  [key: string]: unknown;
}

export interface PhoneUsageDailyRow {
  total_minutes?: number | null;
  late_night_minutes?: number | null;
  social_minutes?: number | null;
  unlocks?: number | null;
}

export interface DailyAggregateRow {
  execution_score?: number | null;
  sleep_hours?: number | null;
  hrv_avg?: number | null;
  readiness_score?: number | null;
  final_state?: string | null;
}

export interface WeeklyReviewRow {
  week_start: string;
  review_completed_at?: string | null;
  pillar_scores?: Record<string, unknown> | null;
  week_intention?: string | null;
  proud_of?: string | null;
  do_differently?: string | null;
  sabotage?: string | null;
  week_highlight?: string | null;
  week_regret?: string | null;
  new_belief?: string | null;
}

export interface DailyWinResultRow {
  date: string;
  result?: string | null;
}

export interface KpiEntryRow {
  week_start: string;
  value?: number | null;
  kpi_id?: string | null;
}

export interface RecapStreamRow {
  timestamp: string;
  source: string;
  classification?: string | null;
  content?: string | null;
  importance_score?: number | null;
}

export interface OuraDailyTrendRow {
  date: string;
  total_sleep_hours?: number | null;
  readiness_score?: number | null;
  sleep_score?: number | null;
}

export interface StravaActivityRow {
  start_date: string;
  name?: string | null;
  sport_type?: string | null;
  distance?: number | null;
}

export interface ReconciliationRow {
  date: string;
  day_score?: number | null;
  mode?: string | null;
  morning_action?: string | null;
  user_response?: string | null;
}

export interface BehavioralPatternRow {
  pattern_type: string;
  title?: string | null;
  evidence_text?: string | null;
  status: string;
  confidence?: number | null;
  occurrence_count?: number | null;
}

export interface RecapProjectRow {
  id: string;
  name: string;
  goal?: string | null;
  status: string;
}

export interface HabitLogRow {
  date: string;
  logged_at?: string | null;
  final_stimulus?: string | null;
  context_note?: string | null;
}

export interface StreamRow {
  id?: string;
  content: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}
