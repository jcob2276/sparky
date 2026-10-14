import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HealthCoachWeeklyReviewView } from './HealthCoachWeeklyReview';
import type { HealthCoachWeeklyReview } from '@vanguard/domain';

const mockReview: HealthCoachWeeklyReview = {
  weekStart: '2026-10-12',
  weekEnd: '2026-10-18',
  goalProgress: [
    {
      kpiId: 'k1',
      name: 'Wyciskanie leżąc',
      target: 100,
      currentValue: null,
      unit: 'kg',
      standard: '1RM z pauzą',
      status: 'unassessed',
      evidenceRefs: [],
      note: 'Brak pomiaru',
    },
    {
      kpiId: 'k2',
      name: 'Bieg 10 km',
      target: 2700,
      currentValue: 2650,
      unit: 's',
      standard: 'atest',
      status: 'progressing',
      evidenceRefs: [],
      note: 'Zaliczono',
    },
  ],
  adherence: {
    plannedSessionsCount: 4,
    completedSessionsCount: 3,
    skippedSessionsCount: 0,
    unrecordedSessionsCount: 1,
    cardioKm: 14.5,
    strengthSets: 22,
    adherenceRate: 0.75,
    note: '1 zaplanowana sesja bez zapisu.',
  },
  coverage: {},
  decisions: [],
  nextWeekProposal: {
    action: 'progress',
    rationale: 'Solidna realizacja założeń — dodajemy 2.5% obciążenia.',
    changesSummary: ['Zwiększenie serii głównej w przysiadzie.'],
  },
  assessmentStatus: 'evaluated',
  summary: 'Tydzień oceniony pozytywnie.',
};

describe('HealthCoachWeeklyReviewView', () => {
  it('renders adherence metrics with Garmin cardio and unrecorded distinction', () => {
    render(<HealthCoachWeeklyReviewView review={mockReview} />);
    expect(screen.getByText('3 / 4')).toBeInTheDocument();
    expect(screen.getByText('14.5 km')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText(/brak wpisu ≠ opuszczenie/)).toBeInTheDocument();
  });

  it('renders KPI progress with explicit standard and unassessed status', () => {
    render(<HealthCoachWeeklyReviewView review={mockReview} />);
    expect(screen.getByText('Wyciskanie leżąc')).toBeInTheDocument();
    expect(screen.getByText('Standard: 1RM z pauzą')).toBeInTheDocument();
    expect(screen.getByText('Brak świeżego pomiaru')).toBeInTheDocument();
    expect(screen.getByText('Do oceny')).toBeInTheDocument();
    expect(screen.getByText('Bieg 10 km')).toBeInTheDocument();
    expect(screen.getByText('Progres')).toBeInTheDocument();
  });

  it('renders next week recommendation with rationale', () => {
    render(<HealthCoachWeeklyReviewView review={mockReview} />);
    expect(screen.getByText('Progresja')).toBeInTheDocument();
    expect(screen.getByText(/Solidna realizacja założeń/)).toBeInTheDocument();
    expect(screen.getByText('Zwiększenie serii głównej w przysiadzie.')).toBeInTheDocument();
  });
});
