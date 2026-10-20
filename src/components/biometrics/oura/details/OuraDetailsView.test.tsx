import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sleepDriversFixture } from '../../../../lib/biometrics/sleepDrivers/sleepDrivers.fixture';
import type { UseSleepDriversResult } from '../../../../lib/biometrics/sleepDrivers/types';
import type { OuraHealthHubData } from '../types';
import { DetailsDriversSection } from './DetailsDriversSection';
import { OuraDetailsView } from './OuraDetailsView';

vi.mock('../../health/HealthChartsContainer', () => ({ HealthChartsContainer: () => <div>wykres</div> }));
vi.mock('./DetailsHealthspanReadOnly', () => ({ DetailsHealthspanReadOnly: () => <div>healthspan</div> }));
vi.mock('../OuraSleepRegularitySection', () => ({ OuraSleepRegularitySection: () => <div>regularnosc</div> }));

const data: OuraHealthHubData = { date: '2026-10-20', strainRow: null, oura: null, userId: 'u1' };
const ready: UseSleepDriversResult = { data: sleepDriversFixture, isLoading: false, error: null };

beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });

describe('DetailsDriversSection states', () => {
  it('renders driver cards, the Top 5 block and honest coverage', () => {
    render(<DetailsDriversSection data={data} drivers={ready} />);
    expect(screen.getByRole('article', { name: 'Trening przed snem' })).toBeInTheDocument();
    expect(screen.getByText('Sen → Twoja piątka')).toBeInTheDocument();
    expect(screen.getByText('Pokrycie danych')).toBeInTheDocument();
    expect(screen.getByText('ActivityWatch nie synchronizuje się od 2026-06-10.')).toBeInTheDocument();
    expect(screen.getByText('Dane nieaktualne')).toBeInTheDocument();
  });

  it('shows loading, error and empty states', () => {
    const { rerender } = render(<DetailsDriversSection data={data} drivers={{ data: null, isLoading: true, error: null }} />);
    expect(screen.getByLabelText('Ładowanie zależności snu')).toBeInTheDocument();
    rerender(<DetailsDriversSection data={data} drivers={{ data: null, isLoading: false, error: new Error('x') }} />);
    expect(screen.getByText('Nie udało się policzyć zależności snu')).toBeInTheDocument();
    rerender(<DetailsDriversSection data={data} drivers={{ data: null, isLoading: false, error: null }} />);
    expect(screen.getByText('Brak danych do analizy zależności snu.')).toBeInTheDocument();
  });

  it('does not present insufficient effects as conclusions', () => {
    const insufficient: UseSleepDriversResult = {
      isLoading: false, error: null,
      data: { ...sleepDriversFixture, effects: sleepDriversFixture.effects.map((e) => ({ ...e, strength: 'insufficient' as const })) },
    };
    render(<DetailsDriversSection data={data} drivers={insufficient} />);
    expect(screen.queryByRole('article', { name: 'Trening przed snem' })).not.toBeInTheDocument();
    expect(screen.getByText(/żaden czynnik nie ma dość nocy/)).toBeInTheDocument();
  });
});

describe('OuraDetailsView', () => {
  it('has anchors, scrolls to the requested section and offers no forms or food sections', () => {
    render(<OuraDetailsView data={data} drivers={ready} initialAnchor="drivers" />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    const nav = screen.getByRole('navigation', { name: 'Sekcje szczegółów' });
    expect(nav.querySelectorAll('button')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Wykresy' }));
    expect(screen.getByRole('button', { name: 'Wykresy' })).toHaveAttribute('aria-current', 'true');
    expect(screen.queryByText(/Jedzenie|Nawodnienie|Suplement|Check-in/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('mounts collapsed chart sections lazily', () => {
    render(<OuraDetailsView data={data} drivers={ready} />);
    expect(screen.queryByText('wykres')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Własne wykresy zdrowia' }));
    expect(screen.getByText('wykres')).toBeInTheDocument();
  });
});
