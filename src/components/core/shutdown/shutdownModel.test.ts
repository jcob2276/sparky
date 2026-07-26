import { describe, expect, it } from 'vitest';
import { buildShutdownRecord } from './shutdownModel';

describe('buildShutdownRecord', () => {
  it('persists task completion and omits daily RPE', () => {
    const record = buildShutdownRecord({
      date: '2026-07-26',
      dayScore: 8,
      moodScore: 4,
      reflectionText: 'Za dużo przełączeń kontekstu.',
      completedTasks: [true, false, true, false, true],
      activeTaskIndexes: [0, 1, 2],
    });

    expect(record.dailyWinPatch).toMatchObject({
      done_1: true,
      done_2: false,
      done_3: true,
      mood_score: 4,
      result: 'P',
    });
    expect(record.dailyWinPatch).not.toHaveProperty('daily_rpe');
    expect(record.streamContent).not.toContain('RPE');
    expect(record.streamMetadata).not.toHaveProperty('rpe');
  });

  it('marks the day complete when every active task is checked', () => {
    const record = buildShutdownRecord({
      date: '2026-07-26',
      dayScore: 9,
      moodScore: 5,
      reflectionText: '',
      completedTasks: [true, true, false, false, false],
      activeTaskIndexes: [0, 1],
    });

    expect(record.dailyWinPatch.result).toBe('Z');
  });
});
