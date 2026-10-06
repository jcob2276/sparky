import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VoicePlanSlotsPreview from './VoicePlanSlotsPreview';
import type { PlanSlotItem } from '../../../lib/voicePlanningApi';
import * as morningPlanApi from '../../../lib/morningPlanApi';
import { saveInterviewPlan } from '../../../lib/voicePlanningApi';

describe('VoicePlanSlotsPreview', () => {
  const sampleSlots: PlanSlotItem[] = [
    { slot: 1, category: 'cialo', title: 'Trening siłowy góra' },
    { slot: 2, category: 'duch', title: 'Medytacja 15 min' },
    { slot: 3, category: 'konto', title: 'Wdrożenie modułu w Sparky' },
    { slot: 4, category: 'general', title: '' },
    { slot: 5, category: 'general', title: '' },
  ];

  it('renders all 5 category badges and filled titles', () => {
    render(
      <VoicePlanSlotsPreview
        slots={sampleSlots}
        onClearSlot={vi.fn()}
        onEditSlot={vi.fn()}
      />
    );

    expect(screen.getByText('Ciało')).toBeInTheDocument();
    expect(screen.getByText('Duch')).toBeInTheDocument();
    expect(screen.getByText('Konto')).toBeInTheDocument();
    expect(screen.getByText('Ruch 4')).toBeInTheDocument();
    expect(screen.getByText('Ruch 5')).toBeInTheDocument();

    expect(screen.getByText('Trening siłowy góra')).toBeInTheDocument();
    expect(screen.getByText('Medytacja 15 min')).toBeInTheDocument();
    expect(screen.getByText('Wdrożenie modułu w Sparky')).toBeInTheDocument();
    expect(screen.getByText('3/5')).toBeInTheDocument();
  });
});

describe('saveInterviewPlan', () => {
  it('calls submitMorningPlanRpc with formatted slots and defaults', async () => {
    const spy = vi.spyOn(morningPlanApi, 'submitMorningPlanRpc').mockResolvedValue('win-uuid');

    const slots: PlanSlotItem[] = [
      { slot: 1, category: 'cialo', title: 'Bieg 10km' },
      { slot: 2, category: 'duch', title: 'Czytanie 30 min' },
      { slot: 3, category: 'konto', title: 'Dokończenie zadania' },
      { slot: 4, category: 'general', title: 'Przegląd maili' },
      { slot: 5, category: 'general', title: 'Planowanie' },
    ];

    const result = await saveInterviewPlan('user-1', '2026-10-01', slots);
    expect(result).toBe('win-uuid');
    expect(spy).toHaveBeenCalledWith(
      'user-1',
      '2026-10-01',
      [
        { slot: 1, title: 'Bieg 10km', category: 'cialo', todo_id: null },
        { slot: 2, title: 'Czytanie 30 min', category: 'duch', todo_id: null },
        { slot: 3, title: 'Dokończenie zadania', category: 'konto', todo_id: null },
        { slot: 4, title: 'Przegląd maili', category: 'general', todo_id: null },
        { slot: 5, title: 'Planowanie', category: 'general', todo_id: null },
      ],
      [],
    );

    spy.mockRestore();
  });
});
