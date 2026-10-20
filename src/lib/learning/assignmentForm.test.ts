import { describe, expect, it } from 'vitest';
import {
  defaultTotalFor,
  guessResourceType,
  initialFormState,
  validateAssignmentForm,
  type AssignmentFormState,
} from './assignmentForm';

const form = (patch: Partial<AssignmentFormState> = {}): AssignmentFormState => ({
  ...initialFormState('2026-10-21'),
  title: 'Never Split the Difference',
  total: '240',
  ...patch,
});

describe('guessResourceType', () => {
  it('wideo i podcasty rozpoznaje po domenie, resztę traktuje jak artykuł', () => {
    expect(guessResourceType({ url: 'https://youtu.be/x', domain: 'youtu.be' })).toBe('video');
    expect(guessResourceType({ url: 'https://open.spotify.com/episode/1', domain: 'open.spotify.com' })).toBe('podcast');
    expect(guessResourceType({ url: 'https://blog.example.com/a', domain: 'blog.example.com' })).toBe('article');
  });
});

describe('initialFormState', () => {
  it('termin domyślnie na koniec miesiąca, książka w stronach', () => {
    const s = initialFormState('2026-10-21');
    expect(s.dueDate).toBe('2026-10-31');
    expect(s.resourceType).toBe('book');
    expect(s.unit).toBe('pages');
    expect(s.total).toBe('');
  });
  it('link z Pocket wypełnia tytuł i typ, a artykuł ma 1 sztukę', () => {
    const s = initialFormState('2026-10-21', { id: 'l1', url: 'https://x.com/a', domain: 'x.com', title: 'Artykuł o closingu' } as never);
    expect(s.title).toBe('Artykuł o closingu');
    expect(s.linkId).toBe('l1');
    expect(s.resourceType).toBe('article');
    expect(s.total).toBe('1');
    expect(defaultTotalFor('video', 'minutes')).toBe('');
  });
});

describe('validateAssignmentForm', () => {
  it('poprawny formularz daje gotowy obiekt', () => {
    const result = validateAssignmentForm(form({ skillId: 's1' }), '2026-10-21', '2026-10-01', 1);
    expect(result).toEqual({
      ok: true,
      value: {
        monthStart: '2026-10-01', title: 'Never Split the Difference', resourceType: 'book', unit: 'pages',
        total: 240, dueDate: '2026-10-31', linkId: null, skillId: 's1', position: 1,
      },
    });
  });
  it('wymaga tytułu, ilości i terminu', () => {
    expect(validateAssignmentForm(form({ title: '  ' }), '2026-10-21', '2026-10-01', 0)).toMatchObject({ ok: false });
    expect(validateAssignmentForm(form({ total: '' }), '2026-10-21', '2026-10-01', 0)).toMatchObject({ ok: false });
    expect(validateAssignmentForm(form({ dueDate: '' }), '2026-10-21', '2026-10-01', 0)).toMatchObject({ ok: false });
  });
  it('odrzuca ilość 0, ułamki, minusy i zbyt dużą', () => {
    for (const total of ['0', '1.5', '-3', '5001', 'abc']) {
      expect(validateAssignmentForm(form({ total }), '2026-10-21', '2026-10-01', 0).ok).toBe(false);
    }
  });
  it('termin nie może być w przeszłości', () => {
    const result = validateAssignmentForm(form({ dueDate: '2026-10-20' }), '2026-10-21', '2026-10-01', 0);
    expect(result).toEqual({ ok: false, error: 'Termin nie może być w przeszłości.' });
  });
  it('pusta umiejętność to null, a link z Pocket jest zachowany', () => {
    const result = validateAssignmentForm(form({ skillId: '', linkId: 'l9' }), '2026-10-21', '2026-10-01', 2);
    expect(result).toMatchObject({ ok: true, value: { skillId: null, linkId: 'l9', position: 2 } });
  });
});
