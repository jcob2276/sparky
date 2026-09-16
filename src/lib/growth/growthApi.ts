import { supabase } from '../supabase';
import type { Database } from '../database.types';
import type {
  GrowthDashboardData,
  GrowthProjectItem,
  GrowthTaskItem,
  LibraryItem,
  PracticeEvidence,
  VanguardIdentityData,
} from './growth.types';
import { COLOR_TO_PILLAR } from '../projects/pillars';

export async function fetchGrowthDashboardData(userId: string): Promise<GrowthDashboardData> {
  const [identityRes, projectsRes, todosRes] = await Promise.all([
    supabase
      .from('vanguard_identity')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('projects')
      .select('id, name, goal, color, status, deadline')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('todo_items')
      .select('id, title, project_id, status, due_date, priority')
      .eq('user_id', userId)
      .neq('status', 'done')
      .neq('status', 'dropped')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const rawIdentity = identityRes.data;
  const libraryItems: LibraryItem[] = Array.isArray(rawIdentity?.library_items)
    ? (rawIdentity.library_items as unknown as LibraryItem[])
    : [];
  const practiceEvidences: PracticeEvidence[] = Array.isArray(rawIdentity?.practice_evidences)
    ? (rawIdentity.practice_evidences as unknown as PracticeEvidence[])
    : [];

  const rawProjects = projectsRes.data ?? [];
  const rawTodos = (todosRes.data ?? []) as GrowthTaskItem[];

  // Map task counts per project
  const taskCountMap = new Map<string, number>();
  for (const t of rawTodos) {
    if (t.project_id) {
      taskCountMap.set(t.project_id, (taskCountMap.get(t.project_id) ?? 0) + 1);
    }
  }

  // Filter projects relevant to growth (Duch / Konto / Learning) or all active projects
  const growthProjects: GrowthProjectItem[] = rawProjects
    .map((p) => {
      const pillar = (p.color && COLOR_TO_PILLAR[p.color]) ? COLOR_TO_PILLAR[p.color] : 'duch';
      return {
        id: p.id,
        name: p.name,
        goal: p.goal ?? null,
        pillar,
        status: p.status,
        deadline: p.deadline ?? null,
        openTasksCount: taskCountMap.get(p.id) ?? 0,
      };
    })
    .filter((p) => p.pillar === 'duch' || p.pillar === 'konto');

  const projectIds = new Set(growthProjects.map((p) => p.id));
  const relevantTasks: GrowthTaskItem[] = rawTodos.filter((t) => {
    if (t.project_id && projectIds.has(t.project_id)) return true;
    const lower = t.title.toLowerCase();
    return lower.includes('książk') || lower.includes('kurs') || lower.includes('nauka') || lower.includes('czyta') || lower.includes('angiel');
  });

  const identity: VanguardIdentityData | null = rawIdentity
    ? {
        user_id: rawIdentity.user_id,
        development_theme: rawIdentity.development_theme,
        development_gap: rawIdentity.development_gap,
        current_role: rawIdentity.current_role,
        developed_role: rawIdentity.developed_role,
        library_items: libraryItems,
        practice_evidences: practiceEvidences,
        development_review: (rawIdentity.development_review as unknown as VanguardIdentityData['development_review']) ?? null,
        updated_at: rawIdentity.updated_at,
      }
    : null;

  return {
    identity,
    projects: growthProjects,
    tasks: relevantTasks,
    libraryItems,
    practiceEvidences,
  };
}

export async function updateVanguardIdentity(
  userId: string,
  updates: Partial<VanguardIdentityData>,
): Promise<void> {
  const insertData = {
    user_id: userId,
    ...updates,
    updated_at: new Date().toISOString(),
  } as unknown as Database['public']['Tables']['vanguard_identity']['Insert'];

  const { error } = await supabase.from('vanguard_identity').upsert(insertData);
  if (error) throw error;
}

export async function saveLibraryItems(userId: string, items: LibraryItem[]): Promise<void> {
  await updateVanguardIdentity(userId, { library_items: items });
}

export async function savePracticeEvidences(userId: string, evidences: PracticeEvidence[]): Promise<void> {
  await updateVanguardIdentity(userId, { practice_evidences: evidences });
}
