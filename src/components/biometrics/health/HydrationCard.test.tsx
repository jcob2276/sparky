import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HydrationCard } from './HydrationCard';

describe('HydrationCard', () => {
  it('renders dynamic target, sweat loss, and increments water on button click', () => {
    const onAddWater = vi.fn();
    render(
      <HydrationCard
        initialData={{
          baseTargetMl: 2500,
          sweatLossMl: 600,
          dynamicTargetMl: 3100,
          loggedIntakeMl: 1500,
          remainingMl: 1600,
          percentage: 48,
          status: 'behind',
          statusLabel: 'Wymaga uzupełnienia',
          needsElectrolytes: false,
          electrolyteAdvisory: null,
          recommendation: 'Pozostało 1600 ml do wypicia.',
        }}
        onAddWater={onAddWater}
      />
    );

    expect(screen.getByText('Nawodnienie & Kompensacja Potu')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.getByText('/ 3100 ml')).toBeInTheDocument();
    expect(screen.getByText('+600 ml')).toBeInTheDocument();
    expect(screen.getAllByText(/Pozostało 1600 ml/i).length).toBeGreaterThanOrEqual(1);

    const add250Btn = screen.getByRole('button', { name: /dodaj 250 ml/i });
    fireEvent.click(add250Btn);

    expect(onAddWater).toHaveBeenCalledWith(250);
    expect(screen.getByText('1750')).toBeInTheDocument();
  });

  it('renders electrolyte alert when sweat loss is high', () => {
    render(
      <HydrationCard
        initialData={{
          baseTargetMl: 2500,
          sweatLossMl: 850,
          dynamicTargetMl: 3350,
          loggedIntakeMl: 800,
          remainingMl: 2550,
          percentage: 24,
          status: 'dehydration_risk',
          statusLabel: 'Ryzyko odwodnienia',
          needsElectrolytes: true,
          electrolyteAdvisory: 'Wysoki ubytek potu (~850 ml). Zalecana suplementacja sodu.',
          recommendation: 'Uzupełnij wodę z elektrolitami.',
        }}
      />
    );

    expect(screen.getByText(/Ryzyko odwodnienia/i)).toBeInTheDocument();
    expect(screen.getByText(/Zalecana suplementacja sodu/i)).toBeInTheDocument();
  });
});
