import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { sleepDriversFixture } from '../../../../lib/biometrics/sleepDrivers/sleepDrivers.fixture';
import type { UseSleepDriversResult } from '../../../../lib/biometrics/sleepDrivers/types';
import { buildFactorTiles } from './nightFactors';
import { OuraDriverEffects } from './OuraDriverEffects';
import { pickTopEffects } from './pickTopEffects';
import { OuraNightFactorsStrip } from './OuraNightFactorsStrip';
import { OuraTodayHero } from './OuraTodayHero';

const ok: UseSleepDriversResult = { data: sleepDriversFixture, isLoading: false, error: null };

describe('buildFactorTiles', () => {
  it('formats gaps and never shows a dead number for stale sources', () => {
    const tiles = buildFactorTiles(sleepDriversFixture.lastNight!, sleepDriversFixture.coverage);
    expect(tiles.find(t => t.key === 'caffeine')).toMatchObject({ value: '12:11', hint: '12,8 h przed snem' });
    expect(tiles.find(t => t.key === 'sauna')).toMatchObject({ value: 'Brak', state: 'empty' });
    const pc = tiles.find(t => t.key === 'pc')!;
    expect(pc.state).toBe('stale');
    expect(pc.value).toBe('Brak świeżych danych');
    expect(tiles.find(t => t.key === 'phone')).toMatchObject({ value: '74 min' });
    expect(tiles.find(t => t.key === 'weather')).toMatchObject({ value: '11,5 °C', hint: 'wilgotność 82%', state: 'data' });
    expect(tiles.find(t => t.key === 'sun')).toMatchObject({ value: '4,2 h' });
  });
});

describe('OuraNightFactorsStrip', () => {
  it('renders the tiles', () => {
    render(<OuraNightFactorsStrip drivers={ok} />);
    expect(screen.getByText('Co poprzedzało tę noc')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /^Ostatnia kawa: 12:11/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /^Komputer: Brak świeżych danych/ })).toBeInTheDocument();
  });
  it('handles loading, error and no data', () => {
    const { rerender } = render(<OuraNightFactorsStrip drivers={{ data: null, isLoading: true, error: null }} />);
    expect(screen.getByLabelText('Ładowanie kontekstu nocy')).toBeInTheDocument();
    rerender(<OuraNightFactorsStrip drivers={{ data: null, isLoading: false, error: new Error('boom') }} />);
    expect(screen.getByText('boom')).toBeInTheDocument();
    rerender(<OuraNightFactorsStrip drivers={{ data: { ...sleepDriversFixture, lastNight: null }, isLoading: false, error: null }} />);
    expect(screen.getByText('Brak kontekstu ostatniej nocy')).toBeInTheDocument();
  });
});

describe('OuraDriverEffects', () => {
  it('shows effects with evidence badges, the Top 5 card and opens all drivers', () => {
    const onOpen = vi.fn();
    render(<OuraDriverEffects drivers={ok} onOpenDrivers={onOpen} />);
    expect(screen.getByText(/Trening kończony mniej niż 3 h/)).toBeInTheDocument();
    expect(screen.getByText(/Prawdopodobne/)).toBeInTheDocument();
    expect(screen.getByText('Sen → Twoja piątka')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Wszystkie zależności/ }));
    expect(onOpen).toHaveBeenCalledOnce();
  });
  it('hides insufficient effects and explains honestly when none remain', () => {
    const effects = sleepDriversFixture.effects.map(e => ({ ...e, strength: 'insufficient' as const }));
    expect(pickTopEffects(effects)).toHaveLength(0);
    render(<OuraDriverEffects drivers={{ data: { ...sleepDriversFixture, effects, top5Effects: [] }, isLoading: false, error: null }} onOpenDrivers={vi.fn()} />);
    expect(screen.getByText('Jeszcze nic pewnego')).toBeInTheDocument();
    expect(screen.getByText(/Telefon po 21:30 zbieramy od niedawna/)).toBeInTheDocument();
  });
  it('handles loading and error', () => {
    const { rerender } = render(<OuraDriverEffects drivers={{ data: null, isLoading: true, error: null }} onOpenDrivers={vi.fn()} />);
    expect(screen.getByLabelText('Liczę zależności')).toBeInTheDocument();
    rerender(<OuraDriverEffects drivers={{ data: null, isLoading: false, error: new Error('x') }} onOpenDrivers={vi.fn()} />);
    expect(screen.getByText('Nie udało się policzyć zależności')).toBeInTheDocument();
  });
});

describe('OuraTodayHero', () => {
  it('shows a short verdict and routes ring clicks to details', () => {
    const onOpen = vi.fn();
    render(<OuraTodayHero data={{ strainRow: null, oura: null }} asOf="2026-10-18" onOpenDetails={onOpen} />);
    expect(screen.getByText('Zbieramy dane do porównania')).toBeInTheDocument();
    expect(screen.queryByText(/co najmniej 4 dni/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Jak liczymy kierunek' }));
    expect(screen.getByText(/co najmniej 4 dni/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Sen:/ }));
    expect(onOpen).toHaveBeenCalledWith('sleep');
    fireEvent.click(screen.getByRole('button', { name: /^Regeneracja:/ }));
    expect(onOpen).toHaveBeenCalledWith('recovery');
  });
});
