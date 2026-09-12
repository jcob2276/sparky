import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Tables } from '../../../lib/database.types';
import type { OuraRow, NutritionDayRow, LenieLogRow } from '../desktopUtils';
import type { PatternRow, WikiRow, KnowledgeRow } from '../general/IntelligencePanel';
import type { StrainData } from '../hero/CockpitBanner';
import {
  fetchDesktopDashboardData,
  type DesktopQueryResult,
  type DesktopSessionRow,
  type StravaActivityRow,
} from '../../../lib/desktopDashboardApi';

export type { DesktopSessionRow, StravaActivityRow };

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  goal: string | null;
  color: string | null;
  deadline: string | null;
  sense_status?: string | null;
}

interface MoveRow {
  id: string;
  title: string;
  status: string;
  completed_at: string | null;
  planned_for: string | null;
  project_id: string | null;
}

export interface GoalsRow {
  goal_cialo: string | null;
  goal_duch: string | null;
  goal_konto: string | null;
  date_cialo: string | null;
  date_duch: string | null;
  date_konto: string | null;
}

export interface SprintGoalRow {
  id: string;
  personal_year: number;
  sprint_number: number;
  goal_text: string | null;
}

interface WinRow {
  [key: string]: unknown;
}

interface MarathonRow {
  name: string;
  date: string;
  target_time: string | null;
  status: string;
}

export type HabitRow = Tables<'habits'>;
export type HabitLogRow = Tables<'habit_logs'>;
type BodyMetricRow = { date: string | null; weight: number | null; waist: number | null; neck: number | null; hips: number | null; body_fat: number | null };

interface DesktopDashboardData {
  loading: boolean;
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
  /** Personal goals resolved from nutrition_targets + nutrition_profile. */
  personalTargets: { proteinFloorG: number; targetKcal: number | null; sleepTargetH: number } | null;
  refresh: () => Promise<void>;
}

import { desktopKeys } from '../../../lib/queryKeys';

export function useDesktopData(userId: string | undefined): DesktopDashboardData {
  const queryClient = useQueryClient();

  const query = useQuery<DesktopQueryResult>({
    queryKey: desktopKeys.dashboard(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      return fetchDesktopDashboardData(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes stale time
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: desktopKeys.dashboard(userId || '') });
  };

  const fallbackData: DesktopQueryResult = {
    oura: [],
    nutrition: [],
    sessions: [],
    body: [],
    heightCm: null,
    strain: null,
    strava: [],
    projects: [],
    moves: [],
    goals: null,
    sprintGoals: [],
    stream: [],
    patterns: [],
    wins: [],
    wiki: [],
    knowledge: [],
    lenieLogs: [],
    habits: [],
    habitLogs: [],
    marathon: null,
    personalTargets: null,
  };

  const d = query.data ?? fallbackData;

  return {
    ...d,
    loading: query.isLoading,
    refresh,
  };
}
