import { supabase } from './supabase';
import { fetchDashboardFallback } from './desktopDashboardFallback';
import type {
  DesktopQueryResult,
  DesktopSessionRow,
  StravaActivityRow,
  BodyMetricRow,
  OuraRow,
  NutritionDayRow,
  StrainData,
  ProjectRow,
  MoveRow,
  GoalsRow,
  SprintGoalRow,
  PatternRow,
  WinRow,
  WikiRow,
  KnowledgeRow,
  LenieLogRow,
  HabitRow,
  HabitLogRow,
  MarathonRow,
} from './desktopDashboardTypes';

export type { DesktopQueryResult, DesktopSessionRow, StravaActivityRow };

export async function fetchDesktopDashboardData(userId: string): Promise<DesktopQueryResult> {
  const [{ data, error }, { data: ntRow }, { data: profileRow }] = await Promise.all([
    supabase.rpc('get_desktop_dashboard_data', { p_user_id: userId }),
    supabase.from('nutrition_targets')
      .select('protein_floor_g, target_kcal')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('nutrition_profile')
      .select('height_cm, sleep_target_hours, protein_g_per_kg')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (error) {
    console.warn('[desktopDashboardApi] RPC failed, using direct fallback:', error.message);
    return fetchDashboardFallback(userId);
  }

  const d = data as Record<string, unknown>;
  const bodyData = (d['body'] as BodyMetricRow[]) || [];
  let proteinFloorG = 140;
  if (ntRow?.protein_floor_g != null && Number(ntRow.protein_floor_g) > 0) {
    proteinFloorG = Number(ntRow.protein_floor_g);
  } else if (profileRow?.protein_g_per_kg != null && bodyData.length) {
    const latestWeight = bodyData[bodyData.length - 1]?.weight;
    if (latestWeight) proteinFloorG = Math.round(Number(latestWeight) * Number(profileRow.protein_g_per_kg));
  }
  const sleepTargetH = profileRow?.sleep_target_hours != null && Number(profileRow.sleep_target_hours) > 0
    ? Number(profileRow.sleep_target_hours) : 8.0;

  return {
    oura: (d['oura'] as OuraRow[]) || [],
    nutrition: (d['nutrition'] as NutritionDayRow[]) || [],
    sessions: (d['sessions'] as DesktopSessionRow[]) || [],
    body: bodyData,
    heightCm: profileRow?.height_cm != null ? Number(profileRow.height_cm) : null,
    strain: (d['strain'] as StrainData) || null,
    strava: (d['strava'] as StravaActivityRow[]) || [],
    projects: (d['projects'] as ProjectRow[]) || [],
    moves: (d['moves'] as MoveRow[]) || [],
    goals: (d['goals'] as GoalsRow) || null,
    sprintGoals: (d['sprintGoals'] as SprintGoalRow[]) || [],
    stream: (d['stream'] as unknown[]) || [],
    patterns: (d['patterns'] as PatternRow[]) || [],
    wins: (d['wins'] as WinRow[]) || [],
    wiki: (d['wiki'] as WikiRow[]) || [],
    knowledge: (d['knowledge'] as KnowledgeRow[]) || [],
    lenieLogs: (d['lenieLogs'] as LenieLogRow[]) || [],
    habits: (d['habits'] as HabitRow[]) || [],
    habitLogs: (d['habitLogs'] as HabitLogRow[]) || [],
    marathon: (d['marathon'] as MarathonRow) || null,
    personalTargets: {
      proteinFloorG,
      targetKcal: ntRow?.target_kcal != null ? Number(ntRow.target_kcal) : null,
      sleepTargetH,
    },
  };
}
