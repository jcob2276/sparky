import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OuraHealthView } from './OuraHealthView';
import Button from '../../ui/Button';
import type { OuraHealthHubData } from './types';
import type { UseSleepDriversResult } from '../../../lib/biometrics/sleepDrivers/types';

vi.mock('./today/OuraTodayView', () => ({
  OuraTodayView: ({ onOpenDetails }: { onOpenDetails: (anchor?: 'drivers') => void }) => (
    <Button variant="ghost" onClick={() => onOpenDetails('drivers')}>today-view</Button>
  ),
}));
vi.mock('./details/OuraDetailsView', () => ({
  OuraDetailsView: ({ initialAnchor }: { initialAnchor?: string }) => (
    <div data-testid="details-view">{initialAnchor ?? 'no-anchor'}</div>
  ),
}));

const data: OuraHealthHubData = {
  date: '2026-07-28',
  strainRow: null,
  oura: { date: '2026-07-28', readiness_score: 88, sleep_score: 84 } as OuraHealthHubData['oura'],
};
const drivers: UseSleepDriversResult = { data: null, isLoading: false, error: null };

function renderView(overrides: Partial<Parameters<typeof OuraHealthView>[0]> = {}) {
  const props = {
    activeSection: 'today' as const,
    data,
    drivers,
    onOpenDetails: vi.fn(),
    onSectionChange: vi.fn(),
    ...overrides,
  };
  return { ...render(<OuraHealthView {...props} />), props };
}

describe('OuraHealthView', () => {
  it('shows a failed source while keeping the active tab rendered', () => {
    renderView({ data: { ...data, sourceErrors: [{ source: 'oura_enhanced', message: 'offline' }] } });
    expect(screen.getByText('Część danych zdrowia jest niedostępna')).toBeInTheDocument();
    expect(screen.getByText(/oura_enhanced: offline/)).toBeInTheDocument();
    expect(screen.getByText('today-view')).toBeInTheDocument();
  });

  it('isolates the Oura-first dark theme and app-width content', () => {
    const { container } = renderView();
    expect(container.firstElementChild).toHaveClass('dark');
    expect(screen.getByTestId('oura-content')).toHaveClass('max-w-3xl');
  });

  it('offers exactly two tabs and marks the active one', () => {
    renderView();
    expect(screen.getByRole('button', { name: 'Dziś' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Szczegóły' })).toHaveAttribute('aria-pressed', 'false');
    for (const removed of ['Przegląd', 'Sen', 'Jedzenie', 'Parametry']) {
      expect(screen.queryByRole('button', { name: removed })).not.toBeInTheDocument();
    }
  });

  it('requests the details tab from the navigation', () => {
    const { props } = renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Szczegóły' }));
    expect(props.onSectionChange).toHaveBeenCalledWith('details');
  });

  it('lets the Dziś tab jump to a section of Szczegóły', () => {
    const { props } = renderView();
    fireEvent.click(screen.getByText('today-view'));
    expect(props.onOpenDetails).toHaveBeenCalledWith('drivers');
  });

  it('renders Szczegóły with the requested anchor', () => {
    renderView({ activeSection: 'details', detailsAnchor: 'drivers' });
    expect(screen.getByTestId('details-view')).toHaveTextContent('drivers');
    expect(screen.queryByText('today-view')).not.toBeInTheDocument();
  });

  it('shows a loading state instead of either tab', () => {
    renderView({ isLoading: true });
    expect(screen.getByText(/Synchronizuję pomiary zdrowia/)).toBeInTheDocument();
    expect(screen.queryByText('today-view')).not.toBeInTheDocument();
  });

  it('exposes sync only when a handler is supplied', () => {
    const { rerender, props } = renderView();
    expect(screen.queryByRole('button', { name: 'Synchronizuj z Oura' })).not.toBeInTheDocument();
    rerender(<OuraHealthView {...props} onSync={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Synchronizuj z Oura' })).toBeInTheDocument();
  });
});
