import { describe, it, expect } from 'vitest';
import {
  createPlanSnapshot,
  restorePlanSnapshot,
  applyApprovedChanges,
  buildCoachEvidencePayload,
  type DiscreteChange,
} from './workoutCoachEngine';

describe('workoutCoachEngine', () => {
  const initialRoutines = [
    {
      id: 'r_push',
      name: 'Push',
      exercises: [
        { name: 'Bench Press', sets: 4, reps: 6 },
        { name: 'Overhead Press', sets: 3, reps: 8 },
      ],
    },
  ];

  describe('snapshots and revert', () => {
    it('creates and restores plan snapshots', () => {
      const snap = createPlanSnapshot(initialRoutines, 'Przed zmianami trenera');
      expect(snap.id).toBeDefined();
      expect(snap.label).toBe('Przed zmianami trenera');

      const modified = [{ ...initialRoutines[0], name: 'Push Modified' }];
      const restored = restorePlanSnapshot([snap], snap.id);

      expect(restored).toEqual(initialRoutines);
      expect(restored).not.toEqual(modified);
    });
  });

  describe('applyApprovedChanges', () => {
    it('applies only approved changes atomically', () => {
      const changes: DiscreteChange[] = [
        {
          id: 'c1',
          type: 'swap_exercise',
          target: { routineName: 'Push', exerciseName: 'Overhead Press' },
          before: 'Overhead Press',
          after: { name: 'Dumbbell Shoulder Press', sets: 3, reps: 10 },
          why: 'Ból barku przy sztandze',
        },
        {
          id: 'c2',
          type: 'change_sets',
          target: { routineName: 'Push', exerciseName: 'Bench Press' },
          before: 4,
          after: 3,
          why: 'Regeneracja klatki',
        },
      ];

      // User approves only c1
      const { updatedRoutines, appliedCount } = applyApprovedChanges(
        initialRoutines,
        changes,
        ['c1']
      );

      expect(appliedCount).toBe(1);
      const push = updatedRoutines[0];
      expect(push.exercises[0].sets).toBe(4); // Unchanged
      expect(push.exercises[1].name).toBe('Dumbbell Shoulder Press'); // Swapped
      expect(push.exercises[1].reps).toBe(10);
    });
  });

  describe('buildCoachEvidencePayload', () => {
    it('summarizes training metrics without sensitive metadata', () => {
      const sessions = [
        {
          date: '2026-08-01',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ weightKg: 100, reps: 5, rir: 1, done: true }],
            },
          ],
        },
        {
          date: '2026-08-05',
          exercises: [
            {
              name: 'Bench Press',
              sets: [{ weightKg: 102.5, reps: 4, rir: 0, done: true }],
            },
          ],
        },
      ];

      const payload = buildCoachEvidencePayload(sessions, {
        goal: 'strength',
        experience: 'intermediate',
        daysPerWeek: 3,
        sessionDurationMin: 60,
        equipment: ['barbell', 'bench'],
      });

      expect(payload.sessionsAnalyzed).toBe(2);
      expect(payload.dateRange.from).toBe('2026-08-01');
      expect(payload.dateRange.to).toBe('2026-08-05');
      expect(payload.exercises['Bench Press'].maxWeight).toBe(102.5);
      expect(payload.exercises['Bench Press'].totalSessions).toBe(2);
    });
  });
});
