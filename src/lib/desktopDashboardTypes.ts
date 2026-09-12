import type { Tables } from './database.types';

export type OuraRow = {
  date: string;
  hrv_avg: number | null;
  rhr_avg: number | null;
  total_sleep_hours: number | null;
  readiness_score: number | null;
  sleep_score: number | null;
};

export type NutritionDayRow = {
  date: string;
  calories: number | null;
  protein: number | null;
};

export type DesktopSessionRow = {
  id: string;
  date: string | null;
  workout_day: string;
  session_rpe: number | null;
  exercise_logs: Array<{
    exercise_name: string;
    weight: number | null;
    reps: number;
    muscle_tags: string[];
    is_pws_or_msp: boolean | null;
    rir: number | null;
    rpe: number | null;
  }>;
};

export type StravaActivityRow = {
  sport_type: string;
  distance: number | null;
  moving_time: number | null;
  start_date: string;
  best_efforts: import('./database.types').Json;
};

export type ProjectRow = {
  id: string;
  name: string;
  status: string;
  goal: string | null;
  color: string;
  deadline: string | null;
};

export type MoveRow = {
  id: string;
  title: string;
  status: string;
  completed_at: string | null;
  planned_for: string | null;
  project_id: string | null;
};

export type GoalsRow = {
  goal_cialo: string | null;
  goal_duch: string | null;
  goal_konto: string | null;
  date_cialo: string | null;
  date_duch: string | null;
  date_konto: string | null;
};

export type SprintGoalRow = {
  id: string;
  personal_year: number;
  sprint_number: number;
  goal_text: string | null;
};

export type StrainData = {
  daily_status: string | null;
  main_limiter: string | null;
  strain_score: number | null;
  recovery_score: number | null;
  fueling_score: number | null;
  fueling_provisional: boolean;
};

export type PatternRow = {
  confidence?: number | null;
  title: string;
  evidence_text?: string | null;
  occurrence_count?: number | null;
  last_seen?: string | null;
};

export type WinRow = {
  id?: string;
  title?: string;
  date?: string;
  description?: string;
};

export type WikiRow = {
  summary?: string | null;
  title: string;
  page_type?: string | null;
};

export type KnowledgeRow = {
  importance_score?: number | null;
  title: string;
  content?: string | null;
  category?: string | null;
};

export type LenieLogRow = {
  date: string;
  final_stimulus?: string | null;
  context_note?: string | null;
};

export type MarathonRow = {
  name: string;
  date: string;
  target_time: string | null;
  status: string;
};

export type HabitRow = Tables<'habits'>;
export type HabitLogRow = Tables<'habit_logs'>;

export type BodyMetricRow = {
  date: string | null;
  weight: number | null;
  waist: number | null;
  neck: number | null;
  hips: number | null;
  body_fat: number | null;
};

export interface DesktopQueryResult {
  oura: OuraRow[];
  nutrition: NutritionDayRow[];
  sessions: DesktopSessionRow[];
  body: BodyMetricRow[];
  heightCm: number | null;
  strain: StrainData | null;
  strava: StravaActivityRow[];
  projects: ProjectRow[];
  moves: MoveRow[];
  goals: GoalsRow | null;
  sprintGoals: SprintGoalRow[];
  stream: unknown[];
  patterns: PatternRow[];
  wins: WinRow[];
  wiki: WikiRow[];
  knowledge: KnowledgeRow[];
  lenieLogs: LenieLogRow[];
  habits: HabitRow[];
  habitLogs: HabitLogRow[];
  marathon: MarathonRow | null;
  personalTargets: {
    proteinFloorG: number;
    targetKcal: number | null;
    sleepTargetH: number;
  } | null;
}

export function mapTodoToMove(row: {
  id: string;
  title: string;
  status: string;
  completed_at: string | null;
  due_date: string | null;
  project_id: string | null;
}): MoveRow {
  return {
    id: row.id,
    title: row.title,
    status: row.status === 'open' ? 'todo' : row.status,
    completed_at: row.completed_at,
    planned_for: row.due_date,
    project_id: row.project_id,
  };
}
