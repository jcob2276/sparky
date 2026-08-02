import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SparkySynthesis } from '@vanguard/domain';
import SynthesisMobileCard from './SynthesisMobileCard';

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
  factors: [],
  conflicts: [{
    id: 'conflict',
    type: 'training_recovery',
    title: 'Interwały kontra regeneracja',
    explanation: 'Regeneracja spada.',
    recommendedResolution: 'Wybierz lekki bieg.',
    severity: 'high',
    candidateIds: [],
  }],
  candidates: [],
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
  topRisk: 'Przeciążony kalendarz',
  topOpportunity: 'Oddaj projekt',
  confidence: {
    overall: 82,
    coverage: 80,
    freshness: 85,
    evidenceStrength: 80,
    level: 'high',
  },
  recommendationOutcomes: [],
};

describe('SynthesisMobileCard', () => {
  it('shows the compiled state, trajectories, lever, conflict and confidence', () => {
    render(<SynthesisMobileCard synthesis={synthesis} onDecision={vi.fn()} />);

    expect(screen.getByText('ograniczona pojemność')).toBeInTheDocument();
    expect(screen.getByText('Oddaj projekt')).toBeInTheDocument();
    expect(screen.getByText('Interwały kontra regeneracja')).toBeInTheDocument();
    expect(screen.getByText(/82%/)).toBeInTheDocument();
    expect(screen.getByText('Regeneracja')).toBeInTheDocument();
  });
});
