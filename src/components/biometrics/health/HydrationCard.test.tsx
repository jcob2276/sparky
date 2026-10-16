import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HydrationCard } from './HydrationCard';
import { calculateDynamicHydration } from '@vanguard/domain';

describe('HydrationCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it('isolates saved intake by account and day, including account changes without unmounting', () => {
    const initialData = calculateDynamicHydration({ loggedIntakeMl: 0 });
    const { rerender } = render(<HydrationCard initialData={initialData} userId="alice" date="2026-10-16" />);
    fireEvent.click(screen.getByRole('button', { name: /dodaj 250 ml/i }));
    expect(screen.getByText('250')).toBeInTheDocument();
    rerender(<HydrationCard initialData={initialData} userId="bob" date="2026-10-16" />);
    expect(screen.getByText('0')).toBeInTheDocument();
    rerender(<HydrationCard initialData={initialData} userId="alice" date="2026-10-16" />);
    expect(screen.getByText('250')).toBeInTheDocument();
    rerender(<HydrationCard initialData={initialData} userId="alice" date="2026-10-17" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
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

  it('dynamically clears dehydration risk badge when intake crosses threshold', () => {
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
          electrolyteAdvisory: 'Wysoki ubytek potu (~850 ml).',
          recommendation: 'Uzupełnij wodę z elektrolitami.',
        }}
      />
    );

    expect(screen.getByText(/Ryzyko odwodnienia/i)).toBeInTheDocument();

    const add500Btn = screen.getByRole('button', { name: /dodaj 500 ml/i });
    fireEvent.click(add500Btn);

    // 800 + 500 = 1300 ml >= 1200 ml, dehydration risk is cleared
    expect(screen.queryByText(/Ryzyko odwodnienia/i)).not.toBeInTheDocument();
    expect(screen.getByText(/W trakcie/i)).toBeInTheDocument();
  });
});
