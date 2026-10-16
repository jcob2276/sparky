import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ThreeRingHeroCard } from './ThreeRingHeroCard';
afterEach(cleanup);

describe('ThreeRingHeroCard', () => {
  it('renders all three rings with their scores and labels', () => {
    render(
      <ThreeRingHeroCard
        strainScore={12.4}
        recoveryScore={85}
        sleepScore={91}
        dateFormatted="14 października 2026"
      />
    );

    expect(screen.getByText('Strain')).toBeInTheDocument();
    expect(screen.getByText('12.4')).toBeInTheDocument();

    expect(screen.getByText('Regeneracja')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();

    expect(screen.getByText('Sen')).toBeInTheDocument();
    expect(screen.getByText('91%')).toBeInTheDocument();

    expect(screen.getByText('Sparky Coach')).toBeInTheDocument();
    expect(screen.getByText(/Wysoka regeneracja/i)).toBeInTheDocument();
  });

  it('triggers onSelectRing when clicking a ring button', () => {
    const handleSelect = vi.fn();
    render(
      <ThreeRingHeroCard
        strainScore={10}
        recoveryScore={70}
        sleepScore={80}
        onSelectRing={handleSelect}
      />
    );

    const strainButton = screen.getByRole('button', { name: /Strain: 10/i });
    fireEvent.click(strainButton);

    expect(handleSelect).toHaveBeenCalledWith('strain');
  });

  it('shows fallback text when scores are null', () => {
    render(
      <ThreeRingHeroCard
        strainScore={null}
        recoveryScore={null}
        sleepScore={null}
      />
    );

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(3);
  });

  it('does not turn a high recovery score into clearance for harder training', () => {
    render(<ThreeRingHeroCard recoveryScore={85} sleepScore={null} strainScore={null} />);
    expect(screen.getByText(/Sam wynik nie ustala gotowości/)).toBeInTheDocument();
    expect(screen.queryByText(/w pełni gotowy/)).not.toBeInTheDocument();
  });
});
