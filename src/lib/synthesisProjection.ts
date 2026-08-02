import type {
  DecisionCandidate,
  HealthspanContributor,
  HealthspanContributorKey,
  SynthesisDomain,
} from '@vanguard/domain';
import type { PreventionAction, PreventionActionStatus } from './health/medicalRecordsApi';
import type { PreventionSuggestion } from './health/medicalRecords';
import { getTodayWarsaw } from './date';
import type { HealthspanLeverRow } from './healthspanCheckinsApi';

interface TodoProjectionRow {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  deadline_date: string | null;
  duration_minutes: number | null;
  status: string;
  updated_at: string;
}

interface ObligationProjectionRow {
  id: string;
  title: string;
  anchor_date: string;
  kind: string;
  updated_at: string;
}

interface ProposalProjectionRow {
  id: string;
  title: string;
  body: string;
  proposal_type: string;
  status: string;
  created_at: string;
}

interface RecommendationProjectionRow {
  id: string;
  recommendation_text: string;
  related_metric: string;
  status: string;
  created_at: string;
  evaluation_window_days: number;
  outcome: string | null;
  decision_status?: string;
}

const dayMs = 24 * 60 * 60 * 1000;
const dateMs = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00Z`).getTime();
const daysUntil = (today: string, date: string) => Math.round((dateMs(date) - dateMs(today)) / dayMs);
const freshness = (timestamp: string) => {
  const ageDays = Math.max(0, (Date.now() - new Date(timestamp).getTime()) / dayMs);
  return Math.max(20, Math.round(100 - ageDays * 8));
};
const dueUrgency = (today: string, dueDate: string | null) => {
  if (!dueDate) return 35;
  const days = daysUntil(today, dueDate);
  if (days <= 0) return 100;
  if (days <= 2) return 90;
  if (days <= 7) return 70;
  if (days <= 30) return 50;
  return 25;
};

const recommendationDomain = (metric: string): SynthesisDomain => {
  if (/sleep|readiness|hrv|recovery/i.test(metric)) return 'recovery';
  if (/strain|training|workout|vo2/i.test(metric)) return 'training';
  if (/nutrition|calorie|protein|weight/i.test(metric)) return 'nutrition';
  return 'execution';
};

const healthspanLever: Record<HealthspanContributorKey, { title: string; domain: SynthesisDomain }> = {
  cardio_fitness: { title: 'Dodaj jakościową sesję aerobową', domain: 'training' },
  resting_heart_rate: { title: 'Postaw dziś na regenerację tlenową', domain: 'recovery' },
  sleep_duration: { title: 'Zabezpiecz pełne okno snu', domain: 'recovery' },
  sleep_regularity: { title: 'Utrzymaj stałą godzinę snu przez 7 dni', domain: 'recovery' },
  daily_movement: { title: 'Domknij dzienny cel kroków', domain: 'training' },
  aerobic_activity: { title: 'Uzupełnij tygodniowy ruch aerobowy', domain: 'training' },
  strength: { title: 'Zaplanuj 2 sesje siłowe w tym tygodniu', domain: 'training' },
  body_composition: { title: 'Utrzymaj kierunek kompozycji ciała', domain: 'nutrition' },
  stress_recovery: { title: 'Dodaj blok realnej regeneracji', domain: 'recovery' },
  lifestyle: { title: 'Wybierz jeden ruch wspierający zdrowie', domain: 'execution' },
  social_connection: { title: 'Zaplanuj jakościowy kontakt z bliską osobą', domain: 'execution' },
};

export function projectHealthspanOpportunities(
  contributors: HealthspanContributor[],
): DecisionCandidate[] {
  return contributors
    .filter((item) => item.direction === 'opportunity')
    .map((item) => {
      const lever = healthspanLever[item.key];
      return {
        id: `healthspan:${item.key}`,
        source: 'healthspan',
        sourceId: item.key,
        domain: lever.domain,
        title: lever.title,
        detail: `${item.label}: ${item.value}. Cel: ${item.benchmark}.`,
        impact: Math.min(100, Math.round(55 + Math.abs(item.ageImpactYears) * 18)),
        urgency: item.score < 40 ? 72 : 52,
        confidence: item.confidence,
        effort: 35,
        freshness: 90,
        status: 'candidate',
        conflictsWith: [],
      };
    });
}

export function projectHealthspanLevers(rows: HealthspanLeverRow[]): DecisionCandidate[] {
  const latestWeek = rows[0]?.week_start;
  return rows
    .filter((item) => item.week_start === latestWeek && (
      item.status === 'proposed' || item.status === 'accepted'
    ))
    .map((item) => ({
      id: `healthspan-lever:${item.id}`,
      source: 'healthspan',
      sourceId: item.id,
      domain: healthspanLever[item.contributor_key as HealthspanContributorKey]?.domain ?? 'recovery',
      title: item.target_label,
      detail: `${item.title}: ${item.baseline_score ?? '—'} → ${item.target_score ?? '—'}`,
      impact: 75,
      urgency: 62,
      confidence: 80,
      effort: 35,
      freshness: 100,
      status: item.status === 'accepted' ? 'accepted' : 'candidate',
      conflictsWith: [],
    }));
}

export function projectTodoItems(rows: TodoProjectionRow[], today: string): DecisionCandidate[] {
  return rows
    .filter((row) => row.status !== 'completed' && row.status !== 'archived')
    .map((row) => {
      const dueDate = row.deadline_date ?? row.due_date;
      return {
        id: `todo:${row.id}`,
        source: 'todo',
        sourceId: row.id,
        domain: 'execution',
        title: row.title,
        detail: dueDate ? `Termin: ${dueDate}` : undefined,
        impact: row.priority === 'urgent' ? 95 : row.priority === 'high' ? 82 : 60,
        urgency: dueUrgency(today, dueDate),
        confidence: 100,
        effort: Math.min(100, Math.round((row.duration_minutes ?? 30) / 1.2)),
        freshness: freshness(row.updated_at),
        dueDate,
        status: 'candidate',
        conflictsWith: [],
      };
    });
}

export function projectLifeObligations(
  rows: ObligationProjectionRow[],
  today: string,
): DecisionCandidate[] {
  return rows
    .filter((row) => daysUntil(today, row.anchor_date) <= 30)
    .map((row) => ({
      id: `obligation:${row.id}`,
      source: 'obligation',
      sourceId: row.id,
      domain: row.kind === 'medical' ? 'medical' : 'calendar',
      title: row.title,
      detail: `Termin: ${row.anchor_date}`,
      impact: row.kind === 'medical' ? 78 : 65,
      urgency: dueUrgency(today, row.anchor_date),
      confidence: 100,
      effort: 15,
      freshness: freshness(row.updated_at),
      dueDate: row.anchor_date,
      status: 'candidate',
      conflictsWith: [],
    }));
}

export function projectSystemProposals(rows: ProposalProjectionRow[]): DecisionCandidate[] {
  return rows
    .filter((row) => row.status === 'pending')
    .map((row) => ({
      id: `proposal:${row.id}`,
      source: 'system_proposal',
      sourceId: row.id,
      domain: 'execution',
      title: row.title,
      detail: row.body,
      impact: row.proposal_type === 'friction_cluster' ? 82 : 65,
      urgency: 55,
      confidence: 75,
      effort: 30,
      freshness: freshness(row.created_at),
      status: 'candidate',
      conflictsWith: [],
    }));
}

export function projectOracleRecommendations(
  rows: RecommendationProjectionRow[],
): DecisionCandidate[] {
  return rows
    .filter((row) => row.status === 'pending' && row.outcome == null && row.decision_status !== 'rejected')
    .map((row) => ({
      id: `recommendation:${row.id}`,
      source: 'oracle_recommendation',
      sourceId: row.id,
      domain: recommendationDomain(row.related_metric),
      title: row.recommendation_text,
      detail: `Okno oceny: ${row.evaluation_window_days} dni`,
      impact: 72,
      urgency: 50,
      confidence: 65,
      effort: 35,
      freshness: freshness(row.created_at),
      status: row.decision_status === 'accepted' ? 'accepted' : 'candidate',
      conflictsWith: [],
    }));
}

export function projectMedicalSuggestions(
  suggestions: PreventionSuggestion[],
  actions: Array<Pick<PreventionAction, 'suggestionKey' | 'status' | 'snoozedUntil'>>,
): DecisionCandidate[] {
  const actionByKey = new Map(actions.map((action) => [action.suggestionKey, action]));
  const now = getTodayWarsaw();
  return suggestions.flatMap((suggestion) => {
    const action = actionByKey.get(suggestion.id);
    const hiddenStatuses: PreventionActionStatus[] = ['done', 'dismissed'];
    if (action && hiddenStatuses.includes(action.status)) return [];
    if (action?.status === 'snoozed' && action.snoozedUntil && action.snoozedUntil > now) return [];
    return [{
      id: `medical:${suggestion.id}`,
      source: 'medical_prevention',
      sourceId: suggestion.id,
      domain: 'medical',
      title: suggestion.title,
      detail: suggestion.reason,
      impact: suggestion.confidence === 'high' ? 82 : 65,
      urgency: dueUrgency(now, suggestion.dueOn),
      confidence: suggestion.confidence === 'high' ? 90 : 65,
      effort: 20,
      freshness: 90,
      dueDate: suggestion.dueOn,
      status: 'candidate',
      conflictsWith: [],
    }];
  });
}
