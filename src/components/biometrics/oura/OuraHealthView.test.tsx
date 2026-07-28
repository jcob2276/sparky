import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OuraHealthView } from './OuraHealthView';
import type { OuraHealthHubData } from './types';

const data: OuraHealthHubData = {
  date: '2026-07-28',
  strainRow: null,
  oura: {
    date: '2026-07-28',
    readiness_score: 88,
    sleep_score: 84,
  } as OuraHealthHubData['oura'],
  enhanced: {
    date: '2026-07-28',
    activity_score: 91,
  } as OuraHealthHubData['enhanced'],
};

describe('OuraHealthView', () => {
  it('shows the three primary health sections', () => {
    render(
      <OuraHealthView
        activeSection="today"
        data={data}
        onOpenSleep={vi.fn()}
        onSectionChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Dzisiaj' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Parametry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Moje zdrowie' })).toBeInTheDocument();
    expect(screen.getByText('Gotowość na dziś')).toBeInTheDocument();
  });

  it('requests the selected section', () => {
    const onSectionChange = vi.fn();
    render(
      <OuraHealthView
        activeSection="today"
        data={data}
        onOpenSleep={vi.fn()}
        onSectionChange={onSectionChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Parametry' }));
    expect(onSectionChange).toHaveBeenCalledWith('vitals');
  });

  it('names missing measurements', () => {
    render(
      <OuraHealthView
        activeSection="today"
        data={{ ...data, oura: null, enhanced: null }}
        onOpenSleep={vi.fn()}
        onSectionChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Brak wyniku gotowości dla tego dnia')).toBeInTheDocument();
  });
});
