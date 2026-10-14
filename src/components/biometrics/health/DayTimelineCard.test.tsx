import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DayTimelineCard } from './DayTimelineCard';
import type { DayTimelineItem } from '@vanguard/domain';

describe('DayTimelineCard', () => {
  it('renders timeline events with titles, durations and metrics', () => {
    const mockItems: DayTimelineItem[] = [
      {
        id: '1',
        type: 'sleep',
        title: 'Główny sen',
        timeFormatted: '01:30 – 08:00',
        durationFormatted: '6h 30m',
        metrics: [{ label: 'Wynik', value: '82' }],
        accentColor: 'indigo',
        timestamp: 1000,
      },
      {
        id: '2',
        type: 'running',
        title: 'Bieg regeneracyjny Z2',
        timeFormatted: '11:00',
        durationFormatted: '35 min',
        metrics: [{ label: 'Dystans', value: '6.5 km' }],
        accentColor: 'orange',
        timestamp: 2000,
      },
    ];

    render(<DayTimelineCard items={mockItems} dateFormatted="14 października 2026" />);

    expect(screen.getByText('Przebieg Dnia (Timeline)')).toBeInTheDocument();
    expect(screen.getByText('14 października 2026')).toBeInTheDocument();
    expect(screen.getByText('Główny sen')).toBeInTheDocument();
    expect(screen.getByText(/6h 30m/i)).toBeInTheDocument();
    expect(screen.getByText(/Wynik: 82/i)).toBeInTheDocument();

    expect(screen.getByText('Bieg regeneracyjny Z2')).toBeInTheDocument();
    expect(screen.getByText(/Dystans: 6.5 km/i)).toBeInTheDocument();
  });

  it('renders empty message when no items are passed', () => {
    render(<DayTimelineCard items={[]} />);

    expect(screen.getByText(/Brak zarejestrowanych aktywności/i)).toBeInTheDocument();
  });
});
