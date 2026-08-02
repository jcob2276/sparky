import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FunctionalAgeProfile, HealthspanPace } from '@vanguard/domain';
import HealthspanPulseCard from './HealthspanPulseCard';

const profile = {
  chronologicalAge: 38,
  estimatedAge: 32,
  ageRange: { low: 30, high: 34 },
  score: 82,
  confidence: { overall: 84, coverage: 89, evidenceStrength: 79, stage: 'established' },
  contributors: [{
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
  }],
  asOfDate: '2026-07-29',
  modelVersion: 'healthspan-v2',
} satisfies FunctionalAgeProfile;

const pace: HealthspanPace = {
  multiplier: 0.87,
  direction: 'improving',
  confidence: 78,
  recentScore: 81,
  baselineScore: 74,
  confounders: [],
};

describe('HealthspanPulseCard', () => {
  it('compresses age range, pace, confidence and top opportunity for mobile', () => {
    render(<HealthspanPulseCard profile={profile} pace={pace} />);

    expect(screen.getByText('30–34')).toBeInTheDocument();
    expect(screen.getByText('0.87×')).toBeInTheDocument();
    expect(screen.getByText(/84% pewności/)).toBeInTheDocument();
    expect(screen.getByText('Trening siłowy')).toBeInTheDocument();
  });
});
