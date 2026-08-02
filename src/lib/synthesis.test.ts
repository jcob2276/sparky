import { describe, expect, it } from 'vitest';
import {
  buildSynthesis,
  calculateSynthesisConfidence,
  calculateTrajectory,
  detectConflicts,
  rankFactors,
  selectLevers,
  shouldEvaluateRecommendation,
  type DecisionCandidate,
  type SynthesisFactor,
} from '@vanguard/domain';

const candidate = (
  id: string,
  overrides: Partial<DecisionCandidate> = {},
): DecisionCandidate => ({
  id,
  source: 'todo',
  sourceId: id,
  domain: 'execution',
  title: id,
  impact: 60,
  urgency: 50,
  confidence: 80,
  effort: 20,
  freshness: 100,
  status: 'candidate',
  conflictsWith: [],
  ...overrides,
});

describe('shouldEvaluateRecommendation', () => {
  it('only admits accepted recommendations that still await evaluation', () => {
    expect(shouldEvaluateRecommendation('pending', 'accepted')).toBe(true);
    expect(shouldEvaluateRecommendation('pending', 'proposed')).toBe(false);
    expect(shouldEvaluateRecommendation('pending', 'rejected')).toBe(false);
    expect(shouldEvaluateRecommendation('evaluated', 'accepted')).toBe(false);
  });
});

describe('calculateTrajectory', () => {
  it('classifies improving, stable, declining and volatile series', () => {
    expect(calculateTrajectory([50, 52, 55, 61, 66])).toBe('improving');
    expect(calculateTrajectory([60, 61, 60, 59, 60])).toBe('stable');
    expect(calculateTrajectory([70, 66, 62, 58, 52])).toBe('declining');
    expect(calculateTrajectory([40, 78, 35, 81, 42])).toBe('volatile');
  });

  it('does not invent a trajectory from fewer than three values', () => {
    expect(calculateTrajectory([70, null])).toBe('insufficient_data');
  });
});

describe('rankFactors', () => {
  it('prioritizes actionable high-impact evidence over fresh but weak noise', () => {
    const factors: SynthesisFactor[] = [
      {
        id: 'noise',
        domain: 'recovery',
        title: 'Świeży, słaby sygnał',
        direction: 'negative',
        impact: 20,
        urgency: 20,
        confidence: 25,
        effort: 10,
        freshness: 100,
        evidence: 'Jeden dzień',
      },
      {
        id: 'sleep',
        domain: 'recovery',
        title: 'Późny sen',
        direction: 'negative',
        impact: 90,
        urgency: 70,
        confidence: 85,
        effort: 25,
        freshness: 80,
        evidence: 'Powtarzalny wzorzec',
      },
    ];

    expect(rankFactors(factors).map((factor) => factor.id)).toEqual(['sleep', 'noise']);
  });
});

describe('detectConflicts', () => {
  it('detects training versus recovery and capacity versus workload conflicts', () => {
    const conflicts = detectConflicts({
      recoveryTrajectory: 'declining',
      trainingIntensityPlanned: true,
      availableMinutes: 60,
      plannedEffortMinutes: 180,
      completedSourceIds: new Set<string>(),
      candidates: [],
    });

    expect(conflicts.map((conflict) => conflict.type)).toEqual([
      'training_recovery',
      'capacity_overload',
    ]);
  });

  it('suppresses a candidate whose source action is already completed', () => {
    const conflicts = detectConflicts({
      recoveryTrajectory: 'stable',
      trainingIntensityPlanned: false,
      availableMinutes: 180,
      plannedEffortMinutes: 60,
      completedSourceIds: new Set(['visit-1']),
      candidates: [candidate('medical', { sourceId: 'visit-1', domain: 'medical' })],
    });

    expect(conflicts[0]?.type).toBe('already_completed');
  });
});

describe('selectLevers', () => {
  it('selects at most three high-value candidates without selecting mutual conflicts', () => {
    const selected = selectLevers([
      candidate('project', { impact: 95, urgency: 95 }),
      candidate('intervals', { impact: 90, urgency: 80, conflictsWith: ['easy-run'] }),
      candidate('easy-run', { impact: 85, urgency: 75, conflictsWith: ['intervals'] }),
      candidate('dentist', { domain: 'medical', impact: 60, urgency: 55 }),
      candidate('pocket', { domain: 'knowledge', impact: 20, urgency: 10 }),
    ]);

    expect(selected).toHaveLength(3);
    expect(selected.map((item) => item.id)).toContain('project');
    expect(
      selected.some((item) => item.id === 'intervals')
      && selected.some((item) => item.id === 'easy-run'),
    ).toBe(false);
  });
});

describe('calculateSynthesisConfidence', () => {
  it('keeps coverage, freshness and evidence visible beside the overall score', () => {
    expect(calculateSynthesisConfidence({
      expectedSources: 5,
      availableSources: 4,
      freshnessScores: [100, 80, 60, 100],
      evidenceScores: [90, 70, 80],
    })).toEqual({
      overall: 82,
      coverage: 80,
      freshness: 85,
      evidenceStrength: 80,
      level: 'high',
    });
  });
});

describe('buildSynthesis', () => {
  it('returns one summary, ranked factors, conflicts and no more than three levers', () => {
    const result = buildSynthesis({
      date: '2026-07-29',
      trajectories: {
        recovery: 'declining',
        training: 'stable',
        nutrition: 'stable',
        execution: 'declining',
        medical: 'stable',
        calendar: 'volatile',
      },
      factors: [
        {
          id: 'calendar',
          domain: 'calendar',
          title: 'Przeciążony kalendarz',
          direction: 'negative',
          impact: 90,
          urgency: 80,
          confidence: 90,
          effort: 20,
          freshness: 100,
          evidence: 'Za mało wolnych okien',
        },
      ],
      candidates: [
        candidate('project', { impact: 95, urgency: 95 }),
        candidate('easy-run', { domain: 'training', impact: 80, urgency: 75 }),
        candidate('sleep', { domain: 'recovery', impact: 85, urgency: 70 }),
        candidate('dentist', { domain: 'medical' }),
      ],
      conflicts: [{
        id: 'training-recovery',
        type: 'training_recovery',
        title: 'Intensywny trening kontra regeneracja',
        explanation: 'Regeneracja spada.',
        recommendedResolution: 'Wybierz lekki trening.',
        severity: 'high',
        candidateIds: ['easy-run'],
      }],
      confidence: {
        overall: 80,
        coverage: 80,
        freshness: 85,
        evidenceStrength: 80,
        level: 'high',
      },
    });

    expect(result.overallState).toBe('ograniczona pojemność');
    expect(result.summary).toContain('regeneracja');
    expect(result.levers).toHaveLength(3);
    expect(result.topRisk).toBe('Przeciążony kalendarz');
  });
});
