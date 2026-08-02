import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FunctionalAgeProfile, HealthspanPace } from '@vanguard/domain';
import HealthspanProfilePanel from './HealthspanProfilePanel';

const profile: FunctionalAgeProfile = {
  asOfDate: '2026-07-29',
  chronologicalAge: 38,
  estimatedAge: 32,
  ageRange: { low: 30, high: 34 },
  score: 82,
  modelVersion: 'healthspan-v2',
  confidence: {
    overall: 84,
    coverage: 89,
    evidenceStrength: 79,
    stage: 'established',
  },
  contributors: [
    {
      key: 'cardio_fitness',
      label: 'Wydolność VO₂ max',
      score: 96,
      direction: 'positive',
      ageImpactYears: -4,
      value: 53,
      benchmark: 'percentyl zależny od wieku 38 i płci',
      source: 'garmin',
      measuredAt: '2026-07-28',
      sampleCount: 4,
      confidence: 80,
      quality: 'device_estimate',
    },
    {
      key: 'strength',
      label: 'Trening siłowy',
      score: 40,
      direction: 'opportunity',
      ageImpactYears: 0.6,
      value: 1,
      benchmark: '≥2 dni/tydzień',
      source: 'sparky',
      measuredAt: '2026-07-27',
      sampleCount: 4,
      confidence: 65,
      quality: 'logged',
    },
  ],
};

const pace: HealthspanPace = {
  multiplier: 0.87,
  direction: 'improving',
  confidence: 78,
  recentScore: 81,
  baselineScore: 74,
  confounders: [],
};

describe('HealthspanProfilePanel', () => {
  it('shows functional age as an interval with pace, contributors and evidence', () => {
    render(<HealthspanProfilePanel profile={profile} pace={pace} />);

    expect(screen.getByRole('heading', { name: 'Wiek funkcjonalny' })).toBeInTheDocument();
    expect(screen.getByText('30–34 lat')).toBeInTheDocument();
    expect(screen.getByText('0.87×')).toBeInTheDocument();
    expect(screen.getByText('Wydolność VO₂ max')).toBeInTheDocument();
    expect(screen.getByText('Garmin')).toBeInTheDocument();
    expect(screen.getByText('Trening siłowy')).toBeInTheDocument();
    expect(screen.getByText(/estymata wellness/i)).toBeInTheDocument();
  });
});
