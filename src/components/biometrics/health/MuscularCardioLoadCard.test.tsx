import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MuscularCardioLoadCard } from './MuscularCardioLoadCard';

describe('MuscularCardioLoadCard', () => {
  it('renders cardio vs muscular split and muscle groups', () => {
    render(
      <MuscularCardioLoadCard
        input={{
          cardioLoad: 45,
          strengthLoad: 25,
          recentSessionsTonnage: {
            'klatka piersiowa': 5000,
          },
        }}
      />
    );

    expect(screen.getByText('Obciążenie Kardio vs Mięśniowe')).toBeInTheDocument();
    expect(screen.getByText(/Kardio \(Garmin\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Siłowe \(Logger\)/i)).toBeInTheDocument();
    expect(screen.getByText('Regeneracja Partii Mięśniowych (Muscle Recovery)')).toBeInTheDocument();
    expect(screen.getByText('Klatka piersiowa')).toBeInTheDocument();
    expect(screen.getByText('Przeciążone / Regeneracja')).toBeInTheDocument();
  });
});
