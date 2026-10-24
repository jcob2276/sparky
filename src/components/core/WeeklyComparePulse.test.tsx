import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChronicleSummaryData } from '../../lib/chronicle/summaryTypes';

const state = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  loading: false,
  summaries: {} as Record<string, ChronicleSummaryData | null>,
}));

vi.mock('./context/DashboardContext', () => ({ useDashboardContext: () => ({ navigateTo: state.navigateTo }) }));
vi.mock('./chronicle/useChronicle', () => ({
  useChronicle: (goal: string) => ({ summary: state.summaries[goal] ?? null, loading: state.loading }),
}));
vi.mock('../../hooks/useHaptics', () => {
  const haptics = { light: vi.fn(), medium: vi.fn(), success: vi.fn(), selection: vi.fn() };
  return { haptics, useHaptics: () => haptics };
});

import { takeChronicleIntent } from '../../lib/chronicle/chronicleIntent';
import WeeklyComparePulse from './WeeklyComparePulse';

const make = (title: string, tiles: Array<[string, string, string | null]>): ChronicleSummaryData => ({
  goalLine: { title, hint: '', pct: null },
  tiles: tiles.map(([label, value, delta]) => ({ label, value, delta, tone: delta?.startsWith('+') ? 'good' as const : 'neutral' as const })),
  chart: { label: '', unit: '', labels: [], values: [] },
  notes: [],
});

describe('WeeklyComparePulse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    takeChronicleIntent();
    state.loading = false;
    state.summaries = {
      duch: make('Duch', [['Wszystkie zwycięstwa', '21', '+2']]),
      konto: make('Konto', [['Umówieni', '16', '+5'], ['Sprzedaże', '1', null]]),
      cialo: make('Ciało', [['Treningi', '3', '−1'], ['Sen', '6,8 h', '+0,3 h']]),
    };
  });

  it('pokazuje kilka liczb z porównaniem do poprzedniego tygodnia', () => {
    render(<WeeklyComparePulse />);
    expect(screen.getByText('Umówieni')).toBeTruthy();
    expect(screen.getByText('+5 vs poprzedni')).toBeTruthy();
    expect(screen.getAllByText('brak porównania')).toHaveLength(1);
    expect(screen.getByText('Treningi')).toBeTruthy();
  });

  it('klik w liczbę otwiera Kronikę na tym celu, z tygodniem zestawionym z poprzednim', () => {
    render(<WeeklyComparePulse />);
    fireEvent.click(screen.getByText('Umówieni'));
    expect(state.navigateTo).toHaveBeenCalledWith('historia');
    expect(takeChronicleIntent()).toEqual({ goal: 'konto', period: 'week', offset: 0, compareOffset: 1 });
  });

  it('skróty prowadzą do porównania tygodni i miesięcy', () => {
    render(<WeeklyComparePulse />);
    fireEvent.click(screen.getByRole('button', { name: /Porównaj miesiące/ }));
    expect(takeChronicleIntent()).toMatchObject({ period: 'month', offset: 0, compareOffset: 1 });
    fireEvent.click(screen.getByRole('button', { name: /Porównaj tygodnie/ }));
    expect(takeChronicleIntent()).toMatchObject({ period: 'week' });
    expect(state.navigateTo).toHaveBeenCalledTimes(2);
  });

  it('bez żadnych danych nie zajmuje miejsca na ekranie', () => {
    state.summaries = {};
    const { container } = render(<WeeklyComparePulse />);
    expect(container.firstChild).toBeNull();
  });
});
