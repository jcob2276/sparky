import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OuraDayNightChart } from './OuraDayNightChart';
import { ouraDayTimelineFixture } from './ouraDayTimelineFixture';

const noop = () => undefined;

describe('OuraDayNightChart', () => {
  beforeEach(() => window.localStorage.clear());

  it('renders lanes, summary and an accessible description', () => {
    render(<OuraDayNightChart timeline={ouraDayTimelineFixture} loading={false} onPrevNight={noop} />);
    expect(screen.getByRole('img', { name: /Wykres dzień-noc.*23:40.*07:30/ })).toBeInTheDocument();
    expect(screen.getByText('Fazy snu')).toBeInTheDocument();
    expect(screen.getByText(/ostatnia kofeina 11:40 → sen: 12 h/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Dzień i noc w tabeli/ })).toBeInTheDocument();
  });

  it('shows a skeleton while loading and no chart', () => {
    render(<OuraDayNightChart timeline={null} loading onPrevNight={noop} />);
    expect(screen.getByLabelText('Ładowanie wykresu')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows empty and error states, keeping night navigation usable', () => {
    const onPrev = vi.fn();
    const { rerender } = render(<OuraDayNightChart timeline={null} loading={false} onPrevNight={onPrev} />);
    expect(screen.getByText('Brak danych z tej nocy.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Poprzednia noc' }));
    expect(onPrev).toHaveBeenCalledOnce();
    rerender(<OuraDayNightChart timeline={null} loading={false} error="Błąd sieci" onPrevNight={onPrev} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Błąd sieci');
  });

  it('disables next night without a handler and calls it otherwise', () => {
    const onNext = vi.fn();
    const { rerender } = render(<OuraDayNightChart timeline={null} loading={false} onPrevNight={noop} />);
    expect(screen.getByRole('button', { name: 'Następna noc' })).toBeDisabled();
    rerender(<OuraDayNightChart timeline={null} loading={false} onPrevNight={noop} onNextNight={onNext} />);
    fireEvent.click(screen.getByRole('button', { name: 'Następna noc' }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('moves the crosshair with the keyboard and announces the moment', () => {
    render(<OuraDayNightChart timeline={ouraDayTimelineFixture} loading={false} onPrevNight={noop} />);
    const chart = screen.getByRole('img');
    fireEvent.keyDown(chart, { key: 'ArrowRight' });
    expect(document.querySelector('.oura-dn-cursor')).not.toBeNull();
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toMatch(/^\d{2}:\d{2}/);
    fireEvent.keyDown(chart, { key: 'Escape' });
    expect(document.querySelector('.oura-dn-cursor')).toBeNull();
  });

  it('switches between day+night and night-only, remembers the choice and shows the pre-sleep strip', () => {
    const { unmount } = render(<OuraDayNightChart timeline={ouraDayTimelineFixture} loading={false} onPrevNight={noop} />);
    expect(screen.getByRole('tab', { name: 'Dzień + noc' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Kofeina w ciele · szczyt 137 mg')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Tylko noc' }));
    expect(screen.getByRole('tab', { name: 'Tylko noc' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText(/Kofeina w ciele · szczyt/)).not.toBeInTheDocument();
    expect(screen.getByText(/przed snem: ostatnia kofeina 11:40/)).toBeInTheDocument();
    expect(window.localStorage.getItem('oura-day-night-view')).toBe('night');
    unmount();
    render(<OuraDayNightChart timeline={ouraDayTimelineFixture} loading={false} onPrevNight={noop} />);
    expect(screen.getByRole('tab', { name: 'Tylko noc' })).toHaveAttribute('aria-selected', 'true');
  });

  it('does not fade on night navigation and survives blocked storage', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<OuraDayNightChart timeline={ouraDayTimelineFixture} loading={false} onPrevNight={noop} />);
    expect(document.querySelector('.oura-dn-swap')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Tylko noc' }));
    expect(document.querySelector('.oura-dn-swap')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Poprzednia noc' }));
    expect(document.querySelector('.oura-dn-swap')).toBeNull();
    spy.mockRestore();
  });

  it('without sleep shows the day only, with a note and no view toggle', () => {
    const noSleep = { ...ouraDayTimelineFixture, sleepStart: null, sleepEnd: null, sleepSegments: [], hrv: [] };
    render(<OuraDayNightChart timeline={noSleep} loading={false} onPrevNight={noop} />);
    expect(screen.getByText(/Brak snu tej nocy — pokazuję sam dzień/)).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText(/Kofeina w ciele · szczyt/)).toBeInTheDocument();
  });
});
