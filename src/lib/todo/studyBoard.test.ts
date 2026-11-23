import { describe, expect, it } from 'vitest';
import { doneRatio, dueLabel, subjectHue, subjectMonogram } from './studyBoard';

describe('studyBoard', () => {
  it('układa monogram ze znaczących słów', () => {
    expect(subjectMonogram('Bezpieczeństwo rozwiązań chmurowych')).toBe('BRC');
    expect(subjectMonogram('Bezpieczeństwo w systemach sterowania i sieciach przemysłowych')).toBe('BSS');
    expect(subjectMonogram('Seminarium dyplomowe')).toBe('SD');
    expect(subjectMonogram('IoT')).toBe('IO');
  });

  it('daje stały odcień dla tej samej nazwy', () => {
    expect(subjectHue('Seminarium dyplomowe')).toBe(subjectHue('Seminarium dyplomowe'));
    expect(subjectHue('A')).toBeGreaterThanOrEqual(0);
    expect(subjectHue('Matematyczne podstawy kryptografii')).toBeLessThan(360);
  });

  it('opisuje termin względem dziś', () => {
    expect(dueLabel('2026-11-23', null)).toBeNull();
    expect(dueLabel('2026-11-23', '2026-11-21')).toEqual({ text: 'po terminie (2 d)', tone: 'overdue' });
    expect(dueLabel('2026-11-23', '2026-11-23')).toEqual({ text: 'dziś', tone: 'soon' });
    expect(dueLabel('2026-11-23', '2026-11-24')).toEqual({ text: 'jutro', tone: 'soon' });
    expect(dueLabel('2026-11-23', '2026-11-26')).toEqual({ text: 'za 3 dni', tone: 'soon' });
    expect(dueLabel('2026-11-23', '2026-12-10')).toEqual({ text: 'za 17 dni', tone: 'calm' });
  });

  it('liczy udział wykonanych', () => {
    expect(doneRatio(0, 0)).toBe(0);
    expect(doneRatio(3, 1)).toBe(0.25);
    expect(doneRatio(0, 2)).toBe(1);
  });
});
