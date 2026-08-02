export type SynthesisDomain =
  | 'recovery'
  | 'training'
  | 'nutrition'
  | 'execution'
  | 'medical'
  | 'calendar'
  | 'knowledge'
  | 'finance'
  | 'growth';

export type DomainTrajectory =
  | 'improving'
  | 'stable'
  | 'declining'
  | 'volatile'
  | 'insufficient_data';

export type CandidateSource =
  | 'todo'
  | 'obligation'
  | 'system_proposal'
  | 'oracle_recommendation'
  | 'medical_prevention'
  | 'healthspan'
  | 'training'
  | 'calendar';

export interface SynthesisFactor {
  id: string;
  domain: SynthesisDomain;
  title: string;
  direction: 'positive' | 'negative';
  impact: number;
  urgency: number;
  confidence: number;
  effort: number;
  freshness: number;
  evidence: string;
  score?: number;
}

export interface DecisionCandidate {
  id: string;
  source: CandidateSource;
  sourceId: string;
  domain: SynthesisDomain;
  title: string;
  detail?: string;
  impact: number;
  urgency: number;
  confidence: number;
  effort: number;
  freshness: number;
  dueDate?: string | null;
  status: 'candidate' | 'accepted' | 'completed' | 'dismissed';
  conflictsWith: string[];
  score?: number;
}

export interface SynthesisConflict {
  id: string;
  type: 'training_recovery' | 'capacity_overload' | 'already_completed' | 'candidate_collision';
  title: string;
  explanation: string;
  recommendedResolution: string;
  severity: 'low' | 'medium' | 'high';
  candidateIds: string[];
}

export interface SynthesisConfidence {
  overall: number;
  coverage: number;
  freshness: number;
  evidenceStrength: number;
  level: 'low' | 'medium' | 'high';
}

export interface SparkySynthesis {
  date: string;
  overallState: 'gotowość' | 'stabilnie' | 'ograniczona pojemność' | 'tryb ochronny';
  summary: string;
  trajectories: Record<Exclude<SynthesisDomain, 'knowledge' | 'finance' | 'growth'>, DomainTrajectory>;
  factors: SynthesisFactor[];
  conflicts: SynthesisConflict[];
  candidates: DecisionCandidate[];
  levers: DecisionCandidate[];
  topRisk: string | null;
  topOpportunity: string | null;
  confidence: SynthesisConfidence;
  recommendationOutcomes: RecommendationOutcomeSummary[];
}

export interface RecommendationOutcomeSummary {
  id: string;
  title: string;
  outcome: 'success' | 'fail' | 'inconclusive' | 'no_data';
  explanation: string;
  evaluatedAt: string | null;
}

export function shouldEvaluateRecommendation(
  evaluationStatus: string,
  decisionStatus: string | null | undefined,
): boolean {
  return evaluationStatus === 'pending' && decisionStatus === 'accepted';
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const average = (values: number[]) => values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length
  : 0;

export function calculateTrajectory(series: Array<number | null | undefined>): DomainTrajectory {
  const values = series.filter((value): value is number => Number.isFinite(value));
  if (values.length < 3) return 'insufficient_data';

  const changes = values.slice(1).map((value, index) => value - values[index]);
  const averageSwing = average(changes.map(Math.abs));
  const range = Math.max(...values) - Math.min(...values);
  if (averageSwing >= 20 && range >= 30) return 'volatile';

  const split = Math.max(1, Math.floor(values.length / 2));
  const delta = average(values.slice(-split)) - average(values.slice(0, split));
  if (Math.abs(delta) < 4) return 'stable';
  return delta > 0 ? 'improving' : 'declining';
}

const priorityScore = (item: Pick<
  DecisionCandidate,
  'impact' | 'urgency' | 'confidence' | 'effort' | 'freshness'
>) => clamp(
  item.impact * 0.34
  + item.urgency * 0.27
  + item.confidence * 0.2
  + item.freshness * 0.09
  + (100 - item.effort) * 0.1,
);

export function rankFactors(factors: SynthesisFactor[]): SynthesisFactor[] {
  return factors
    .map((factor) => ({ ...factor, score: priorityScore(factor) }))
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
}

export interface ConflictInput {
  recoveryTrajectory: DomainTrajectory;
  trainingIntensityPlanned: boolean;
  availableMinutes: number;
  plannedEffortMinutes: number;
  completedSourceIds: Set<string>;
  candidates: DecisionCandidate[];
}

export function detectConflicts(input: ConflictInput): SynthesisConflict[] {
  const conflicts: SynthesisConflict[] = [];
  if (
    input.trainingIntensityPlanned
    && (input.recoveryTrajectory === 'declining' || input.recoveryTrajectory === 'volatile')
  ) {
    conflicts.push({
      id: 'training-recovery',
      type: 'training_recovery',
      title: 'Intensywny trening kontra regeneracja',
      explanation: 'Planowana intensywność konkuruje ze spadającą regeneracją.',
      recommendedResolution: 'Obniż intensywność lub skróć sesję, zachowując ciągłość.',
      severity: 'high',
      candidateIds: input.candidates.filter((item) => item.domain === 'training').map((item) => item.id),
    });
  }

  if (input.plannedEffortMinutes > input.availableMinutes * 1.25) {
    conflicts.push({
      id: 'capacity-overload',
      type: 'capacity_overload',
      title: 'Plan przekracza dostępną pojemność',
      explanation: `Plan wymaga około ${input.plannedEffortMinutes} min przy ${input.availableMinutes} min dostępnego czasu.`,
      recommendedResolution: 'Zostaw najwyżej trzy ruchy i przełóż resztę świadomie.',
      severity: input.plannedEffortMinutes > input.availableMinutes * 2 ? 'high' : 'medium',
      candidateIds: input.candidates.map((item) => item.id),
    });
  }

  for (const item of input.candidates) {
    if (!input.completedSourceIds.has(item.sourceId)) continue;
    conflicts.push({
      id: `completed-${item.id}`,
      type: 'already_completed',
      title: 'Działanie jest już wykonane',
      explanation: `${item.title} nie powinno wracać jako aktywna sugestia.`,
      recommendedResolution: 'Usuń kandydaturę z aktywnej kolejki.',
      severity: 'low',
      candidateIds: [item.id],
    });
  }
  return conflicts;
}

export function selectLevers(candidates: DecisionCandidate[], limit = 3): DecisionCandidate[] {
  const ranked = rankCandidates(candidates)
    .filter((item) => item.status === 'candidate' || item.status === 'accepted');

  const selected: DecisionCandidate[] = [];
  for (const item of ranked) {
    const collides = selected.some((chosen) => (
      chosen.conflictsWith.includes(item.id) || item.conflictsWith.includes(chosen.id)
    ));
    if (!collides) selected.push(item);
    if (selected.length === limit) break;
  }
  return selected;
}

export function rankCandidates(candidates: DecisionCandidate[]): DecisionCandidate[] {
  return candidates
    .filter((item) => item.status === 'candidate' || item.status === 'accepted')
    .map((item) => ({ ...item, score: priorityScore(item) }))
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
}

export function calculateSynthesisConfidence(input: {
  expectedSources: number;
  availableSources: number;
  freshnessScores: number[];
  evidenceScores: number[];
}): SynthesisConfidence {
  const coverage = input.expectedSources > 0
    ? clamp((input.availableSources / input.expectedSources) * 100)
    : 0;
  const freshness = clamp(average(input.freshnessScores));
  const evidenceStrength = clamp(average(input.evidenceScores));
  const overall = clamp(coverage * 0.4 + freshness * 0.3 + evidenceStrength * 0.3);
  return {
    overall,
    coverage,
    freshness,
    evidenceStrength,
    level: overall >= 75 ? 'high' : overall >= 45 ? 'medium' : 'low',
  };
}

export function buildSynthesis(input: {
  date: string;
  trajectories: SparkySynthesis['trajectories'];
  factors: SynthesisFactor[];
  candidates: DecisionCandidate[];
  conflicts: SynthesisConflict[];
  confidence: SynthesisConfidence;
  recommendationOutcomes?: RecommendationOutcomeSummary[];
}): SparkySynthesis {
  const factors = rankFactors(input.factors);
  const candidates = rankCandidates(input.candidates);
  const levers = selectLevers(candidates);
  const declining = Object.entries(input.trajectories)
    .filter(([, value]) => value === 'declining' || value === 'volatile')
    .map(([domain]) => domain);
  const highConflict = input.conflicts.some((conflict) => conflict.severity === 'high');
  const overallState = highConflict
    ? 'ograniczona pojemność'
    : declining.length >= 3
      ? 'tryb ochronny'
      : declining.length
        ? 'ograniczona pojemność'
        : 'stabilnie';
  const summary = declining.length
    ? `Największej uwagi wymaga ${declining.join(' i ')}; regeneracja i realna pojemność wyznaczają zakres.`
    : 'Najważniejsze domeny są stabilne; utrzymaj kierunek bez dokładania zakresu.';
  const negative = factors.find((factor) => factor.direction === 'negative');
  const positive = factors.find((factor) => factor.direction === 'positive');

  return {
    date: input.date,
    overallState,
    summary,
    trajectories: input.trajectories,
    factors,
    conflicts: input.conflicts,
    candidates,
    levers,
    topRisk: negative?.title ?? input.conflicts[0]?.title ?? null,
    topOpportunity: positive?.title ?? levers[0]?.title ?? null,
    confidence: input.confidence,
    recommendationOutcomes: input.recommendationOutcomes ?? [],
  };
}
