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

const activity = { gymCount: 2, runCount: 3, runKm: 21.5, saunaCount: 1, saunaMinutes: 30 };

describe('HealthCoachWeeklyReviewView', () => {
  it('shows real activity and plan adherence without reading unrecorded sessions as skipped', () => {
    render(<HealthCoachWeeklyReviewView review={mockReview} activity={activity} />);
    expect(screen.getByText('21.5 km · 3×')).toBeInTheDocument();
    expect(screen.getByText('1× · 30 min')).toBeInTheDocument();
    expect(screen.getByText(/Plan: 3 z 4 sesji/)).toBeInTheDocument();
    expect(screen.getByText(/to nie znaczy, że opuszczone/)).toBeInTheDocument();
  });

  it('shows measured goals and collapses unmeasured ones into one line', () => {
    render(<HealthCoachWeeklyReviewView review={mockReview} activity={activity} />);
    expect(screen.getByText('Bieg 10 km')).toBeInTheDocument();
    expect(screen.getByText(/Wyciskanie leżąc — czekają na pomiar/)).toBeInTheDocument();
    expect(screen.queryByText('Brak świeżego pomiaru')).not.toBeInTheDocument();
  });

  it('shows a recommendation only when it asks for a change', () => {
    const { rerender } = render(<HealthCoachWeeklyReviewView review={mockReview} activity={activity} />);
    expect(screen.getByText(/Dołóż obciążenia/)).toBeInTheDocument();
    rerender(<HealthCoachWeeklyReviewView review={{ ...mockReview, nextWeekProposal: { action: 'keep', rationale: 'x', changesSummary: [] } }} activity={activity} />);
    expect(screen.queryByText(/Na kolejny tydzień/)).not.toBeInTheDocument();
  });

  it('collapses an empty week to one line instead of empty tiles', () => {
    const empty = { ...mockReview, goalProgress: [], adherence: { ...mockReview.adherence, plannedSessionsCount: null, completedSessionsCount: null, unrecordedSessionsCount: null } };
    render(<HealthCoachWeeklyReviewView review={empty} activity={{ gymCount: 0, runCount: 0, runKm: 0, saunaCount: 0, saunaMinutes: 0 }} />);
    expect(screen.getByText(/Brak zapisanych treningów/)).toBeInTheDocument();
    expect(screen.queryByText(/Plan:/)).not.toBeInTheDocument();
  });
});
