import { describe, expect, it } from 'vitest';
import { buildMorningReflectionRecord } from './morningReflectionModel';

describe('buildMorningReflectionRecord', () => {
  it('targets the reviewed day and writes the same two scores as evening shutdown', () => {
    expect(
      buildMorningReflectionRecord({
        date: '2026-07-27',
        note: 'Za dużo przełączałem kontekst.',
        dayScore: 6,
        moodScore: 3,
      }),
    ).toEqual({
      date: '2026-07-27',
      dailyWinPatch: {
        day_note: 'Za dużo przełączałem kontekst.',
        mood_score: 3,
      },
      dayScore: 6,
    });
  });

  it('trims the reflection before saving it', () => {
    const record = buildMorningReflectionRecord({
      date: '2026-07-27',
      note: '  Dobry trening.  ',
      dayScore: 8,
      moodScore: 4,
    });

    expect(record.dailyWinPatch.day_note).toBe('Dobry trening.');
  });
});
