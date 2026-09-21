import { describe, it, expect } from 'vitest';
import {
  parseStrongCsv,
  parseFitNotesCsv,
  mapHevyWorkoutsJson,
  inferMuscleTags,
  importedSessionToWorkoutExercises,
} from './workoutImporters';

describe('workoutImporters', () => {
  describe('inferMuscleTags', () => {
    it('infers correct muscle tags from exercise names', () => {
      expect(inferMuscleTags('Bench Press (Barbell)')).toEqual(['klatka', 'triceps']);
      expect(inferMuscleTags('Przysiad ze sztangą')).toEqual(['czworogłowe', 'pośladki']);
      expect(inferMuscleTags('Romanian Deadlift')).toEqual(['dwugłowe ud', 'pośladki', 'plecy']);
      expect(inferMuscleTags('Wiosłowanie hantlem')).toEqual(['plecy', 'biceps']);
    });
  });

  describe('parseStrongCsv', () => {
    const sampleStrongCsv = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2026-05-10 18:00:00,Upper Body,45m,Bench Press,1,80,6,,,,"Good session",8
2026-05-10 18:00:00,Upper Body,45m,Bench Press,2,80,6,,,,"Good session",8.5
2026-05-10 18:00:00,Upper Body,45m,Barbell Row,1,70,8,,,,"Good session",7`;

    it('parses Strong CSV into structured sessions', () => {
      const sessions = parseStrongCsv(sampleStrongCsv);
      expect(sessions).toHaveLength(1);

      const session = sessions[0];
      expect(session.date).toBe('2026-05-10');
      expect(session.name).toBe('Upper Body');
      expect(session.exercises).toHaveLength(2);

      const bench = session.exercises[0];
      expect(bench.name).toBe('Bench Press');
      expect(bench.sets).toHaveLength(2);
      expect(bench.sets[0].weightKg).toBe(80);
      expect(bench.sets[0].reps).toBe(6);
      expect(bench.sets[0].rpe).toBe(8);
      expect(bench.sets[0].rir).toBe(2);
    });
  });

  describe('parseFitNotesCsv', () => {
    const sampleFitNotesCsv = `Date,Exercise,Category,Weight (kgs),Reps,Distance,Time,Comment
2026-06-12,Squat,Legs,100,5,,,Felt heavy
2026-06-12,Squat,Legs,100,5,,,
2026-06-12,Overhead Press,Shoulders,50,6,,,`;

    it('parses FitNotes CSV into structured sessions', () => {
      const sessions = parseFitNotesCsv(sampleFitNotesCsv);
      expect(sessions).toHaveLength(1);

      const session = sessions[0];
      expect(session.date).toBe('2026-06-12');
      expect(session.exercises).toHaveLength(2);

      const squat = session.exercises[0];
      expect(squat.name).toBe('Squat');
      expect(squat.sets).toHaveLength(2);
      expect(squat.sets[0].weightKg).toBe(100);
      expect(squat.sets[0].reps).toBe(5);
      expect(squat.sets[0].notes).toBe('Felt heavy');
    });
  });

  describe('mapHevyWorkoutsJson', () => {
    const sampleHevyWorkouts = [
      {
        id: 'hevy_123',
        title: 'Morning Push',
        description: 'Great chest pump',
        start_time: '2026-07-15T08:00:00Z',
        end_time: '2026-07-15T09:00:00Z',
        exercises: [
          {
            title: 'Incline Dumbbell Press',
            sets: [
              { weight_kg: 30, reps: 10, rpe: 8, set_type: 'normal' },
              { weight_kg: 30, reps: 8, rpe: 9.5, set_type: 'normal' },
            ],
          },
        ],
      },
    ];

    it('maps Hevy API payload to Sparky format', () => {
      const sessions = mapHevyWorkoutsJson(sampleHevyWorkouts);
      expect(sessions).toHaveLength(1);

      const session = sessions[0];
      expect(session.date).toBe('2026-07-15');
      expect(session.name).toBe('Morning Push');
      expect(session.durationMinutes).toBe(60);
      expect(session.exercises).toHaveLength(1);

      const ex = session.exercises[0];
      expect(ex.name).toBe('Incline Dumbbell Press');
      expect(ex.sets).toHaveLength(2);
      expect(ex.sets[0].weightKg).toBe(30);
      expect(ex.sets[0].rpe).toBe(8);
      expect(ex.sets[0].rir).toBe(2);
      expect(ex.sets[1].rpe).toBe(9.5);
      expect(ex.sets[1].rir).toBe(0.5);
    });
  });

  describe('importedSessionToWorkoutExercises', () => {
    it('converts imported session into logger exercise format', () => {
      const sample = {
        date: '2026-08-01',
        name: 'Test',
        exercises: [
          {
            name: 'Bench Press',
            muscleTags: ['klatka'],
            sets: [{ setNumber: 1, weightKg: 100, reps: 5, rir: 2, isWarmup: false }],
          },
        ],
      };
      const result = importedSessionToWorkoutExercises(sample);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bench Press');
      expect(result[0].tags).toEqual(['klatka']);
      expect(result[0].sets).toHaveLength(1);
      expect(result[0].sets[0].kg).toBe('100');
      expect(result[0].sets[0].reps).toBe('5');
      expect(result[0].sets[0].rir).toBe('2');
      expect(result[0].sets[0].type).toBe('working');
    });
  });
});

