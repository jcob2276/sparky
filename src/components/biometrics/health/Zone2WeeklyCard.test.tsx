import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Zone2WeeklyCard } from './Zone2WeeklyCard';

describe('Zone2WeeklyCard', () => {
  it('renders target minutes and daily breakdown', () => {
    render(
      <Zone2WeeklyCard
        activities={[
          {
            start_date: '2026-10-12T10:00:00Z',
            icu_hr_zone_times: [0, 3000, 0, 0, 0], // 50 min
          },
        ]}
        asOfDateStr="2026-10-14"
      />
    );

    expect(screen.getByText('Strefa 2 (Baza Tlenowa)')).toBeInTheDocument();
    expect(screen.getByText('50 / 150 min')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('50m')).toBeInTheDocument();
  });
});
