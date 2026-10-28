import { describe, expect, it } from 'vitest';
import { applyYesterdayTaskToggle, applyTodayTaskToggle, buildMorningReflectionRecord } from './morningReflectionModel';

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

  it('updates only the selected yesterday task in the local reflection state', () => {
    const win = {
      id: 'win-yesterday',
      date: '2026-07-31',
      daily_win_tasks: [
        { id: 'task-1', slot: 1, title: 'Sauna', done: false, completed_at: null },
        { id: 'task-2', slot: 2, title: 'Dykcja', done: true, completed_at: '2026-07-31T18:00:00Z' },
      ],
    };

    const updated = applyYesterdayTaskToggle(win, 'task-1', true, '2026-08-01T07:30:00Z');

    expect(updated.daily_win_tasks).toEqual([
      expect.objectContaining({ id: 'task-1', done: true, completed_at: '2026-08-01T07:30:00Z' }),
      expect.objectContaining({ id: 'task-2', done: true, completed_at: '2026-07-31T18:00:00Z' }),
    ]);
    expect(win.daily_win_tasks?.[0].done).toBe(false);
  });

  it('updates selected task immediately without changing mirrored fields', () => {
    const win = {
      id: 'win-today',
      date: '2026-09-15',
      done_1: false,
      completed_at_1: null,
      daily_win_tasks: [
        { id: 't-1', slot: 1, title: 'Trening', done: false, completed_at: null },
        { id: 't-2', slot: 2, title: 'Dykcja', done: false, completed_at: null },
      ],
    };

    const updated = applyTodayTaskToggle(win, 1, true, '2026-09-15T11:00:00Z');

    expect(updated.done_1).toBe(false);
    expect(updated.completed_at_1).toBeNull();
    expect(updated.daily_win_tasks?.[0].done).toBe(true);
    expect(updated.daily_win_tasks?.[0].completed_at).toBe('2026-09-15T11:00:00Z');
    expect(updated.daily_win_tasks?.[1].done).toBe(false);
  });

  it('closes a sparse plan based on its task rows and reopens it on undo', () => {
    const win = { day_note: 'Reviewed', result: null, daily_win_tasks: [
      { slot: 5, title: 'Call', done: false, completed_at: null },
    ] };
    const completed = applyTodayTaskToggle(win, 5, true, 'now');
    expect(completed.result).toBe('Z');
    const undone = applyTodayTaskToggle(completed, 5, false, null);
    expect(undone.result).toBeNull();
    expect(undone.daily_win_tasks[0].completed_at).toBeNull();
  });
});
