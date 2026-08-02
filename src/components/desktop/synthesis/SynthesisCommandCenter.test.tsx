import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SparkySynthesis } from '@vanguard/domain';
import SynthesisCommandCenter from './SynthesisCommandCenter';

const synthesis: SparkySynthesis = {
  date: '2026-07-29',
  overallState: 'ograniczona pojemność',
  summary: 'Regeneracja ogranicza dzisiejszy zakres.',
  trajectories: {
    recovery: 'declining',
    training: 'stable',
    nutrition: 'improving',
    execution: 'stable',
    medical: 'stable',
    calendar: 'volatile',
  },
  factors: [{
    id: 'recovery',
    domain: 'recovery',
    title: 'Ograniczona regeneracja',
    direction: 'negative',
    impact: 90,
    urgency: 85,
    confidence: 95,
    effort: 20,
    freshness: 100,
    evidence: 'Recovery 51/100',
    score: 88,
  }],
  conflicts: [{
    id: 'training-recovery',
    type: 'training_recovery',
    title: 'Interwały kontra regeneracja',
    explanation: 'Regeneracja spada.',
    recommendedResolution: 'Wybierz lekki bieg.',
    severity: 'high',
    candidateIds: [],
  }],
  candidates: [{
    id: 'medical:dentist',
    source: 'medical_prevention',
    sourceId: 'dentist',
    domain: 'medical',
    title: 'Umów dentystę',
    impact: 70,
    urgency: 60,
    confidence: 80,
    effort: 15,
    freshness: 90,
    status: 'candidate',
    conflictsWith: [],
    score: 72,
  }],
  levers: [{
    id: 'todo:1',
    source: 'todo',
    sourceId: '1',
    domain: 'execution',
    title: 'Oddaj projekt',
    impact: 90,
    urgency: 90,
    confidence: 100,
    effort: 60,
    freshness: 100,
    status: 'candidate',
    conflictsWith: [],
  }],
  topRisk: 'Ograniczona regeneracja',
  topOpportunity: 'Oddaj projekt',
  confidence: {
    overall: 82,
    coverage: 80,
    freshness: 85,
    evidenceStrength: 80,
    level: 'high',
  },
  recommendationOutcomes: [{
    id: 'recommendation:1',
    title: 'Kładź się przed 23:00',
    outcome: 'success',
    explanation: 'Sen wzrósł średnio o 35 minut.',
    evaluatedAt: '2026-07-28T10:00:00Z',
  }],
};

describe('SynthesisCommandCenter', () => {
  it('shows command state, ranked evidence, conflicts and three levers', () => {
    render(
      <SynthesisCommandCenter
        synthesis={synthesis}
        onDecision={vi.fn()}
        healthspan={{
          ageRange: { low: 30, high: 34 },
          pace: 0.87,
          recentScore: 81,
          baselineScore: 74,
          coverage: 89,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Centrum decyzji' })).toBeInTheDocument();
    expect(screen.getAllByText('Ograniczona regeneracja')).toHaveLength(2);
    expect(screen.getByText('Interwały kontra regeneracja')).toBeInTheDocument();
    expect(screen.getByText('Oddaj projekt')).toBeInTheDocument();
    expect(screen.getByText(/82% pewności/)).toBeInTheDocument();
    expect(screen.getByText('Kładź się przed 23:00')).toBeInTheDocument();
    expect(screen.getByText('Sprawdziło się')).toBeInTheDocument();
    expect(screen.getByText('Umów dentystę')).toBeInTheDocument();
    expect(screen.getByText('30–34 lat')).toBeInTheDocument();
    expect(screen.getByText('81 vs 74')).toBeInTheDocument();
  });
});
