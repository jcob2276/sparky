import { describe, expect, it } from 'vitest';
import { draftFromSlide, isDraftSavable, normalizeDraft, slideAgeDays, type RealitySlide } from './realitySlide';

const slide: RealitySlide = {
  id: '1', user_id: 'u', title: 'Wariant A', statement: 'Opis', process_steps: ['Praca bez telefonu'],
  created_at: '2026-11-01T10:00:00Z', retired_at: null,
};

describe('realitySlide', () => {
  it('normalizuje szkic: przycina, usuwa puste kroki, limituje do trzech', () => {
    const out = normalizeDraft({ title: '  Tytuł ', statement: ' x ', steps: [' a ', '', 'b', 'c', 'd'] });
    expect(out).toEqual({ title: 'Tytuł', statement: 'x', steps: ['a', 'b', 'c'] });
  });
  it('wymaga tytułu do zapisu', () => {
    expect(isDraftSavable({ title: '   ', statement: '', steps: [''] })).toBe(false);
    expect(isDraftSavable({ title: 'A', statement: '', steps: [''] })).toBe(true);
  });
  it('zawsze zostawia jedno pole kroku w szkicu', () => {
    expect(draftFromSlide({ ...slide, process_steps: [] }).steps).toEqual(['']);
    expect(draftFromSlide(null).title).toBe('');
  });
  it('liczy pełne dni od wyboru i nie schodzi poniżej zera', () => {
    expect(slideAgeDays(slide.created_at, new Date('2026-11-10T10:00:00Z'))).toBe(9);
    expect(slideAgeDays(slide.created_at, new Date('2026-10-30T00:00:00Z'))).toBe(0);
  });
});
