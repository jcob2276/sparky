import { describe, expect, it } from 'vitest';
import { nextRotationDay, withNextRotationFlag } from './templateRotation';

describe('templateRotation', () => {
  it('returns null for fewer than 2 templates', () => {
    expect(nextRotationDay([{ workoutDay: 'Push', date: '2026-10-18' }])).toBeNull();
  });

  it('picks next day after the most recent session (PL sort)', () => {
    const next = nextRotationDay([
      { workoutDay: 'Push', date: '2026-10-18' },
      { workoutDay: 'Legs', date: '2026-10-16' },
      { workoutDay: 'Pull', date: '2026-10-14' },
    ]);
    // Last = Push; order Legs, Pull, Push → next after Push wraps to Legs
    expect(next).toBe('Legs');
  });

  it('flags exactly one template as next', () => {
    const marked = withNextRotationFlag([
      { workoutDay: 'A', date: '2026-10-10', sessionId: '1' },
      { workoutDay: 'B', date: '2026-10-17', sessionId: '2' },
    ]);
    expect(marked.filter((t) => t.isNextInRotation)).toHaveLength(1);
    expect(marked.find((t) => t.isNextInRotation)?.workoutDay).toBe('A');
  });
});
