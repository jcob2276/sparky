import { describe, it, expect } from 'vitest';
import {
  exportPlanBundleToString,
  parseAndMergePlanBundle,
  exercisesToExportedRoutine,
  type PlanBundle,
} from './workoutPlanShare';
import type { WorkoutExercise } from './workout';

describe('workoutPlanShare', () => {
  const sampleExercises: WorkoutExercise[] = [
    {
      id: 101,
      name: 'Wyciskanie leżąc',
      tags: ['klatka'],
      supersetGroup: 'A',
      sets: [
        { id: 1, kg: '85', reps: '6', rir: '1.5', msp: false, type: 'working' },
        { id: 2, kg: '85', reps: '6', rir: '1', msp: false, type: 'working' },
        { id: 3, kg: '85', reps: '5', rir: '0', msp: true, type: 'failure' },
      ],
    },
    {
      id: 102,
      name: 'Wiosłowanie hantlem',
      tags: ['plecy'],
      supersetGroup: 'A',
      sets: [
        { id: 4, kg: '36', reps: '8', rir: '2', msp: false, type: 'working' },
        { id: 5, kg: '36', reps: '8', rir: '2', msp: false, type: 'working' },
      ],
    },
  ];

  it('converts workout exercises to exported routine', () => {
    const routine = exercisesToExportedRoutine('Upper Body Blast', sampleExercises, 'Fajny trening');
    expect(routine.name).toBe('Upper Body Blast');
    expect(routine.exercises).toHaveLength(2);
    expect(routine.exercises[0].name).toBe('Wyciskanie leżąc');
    expect(routine.exercises[0].sets).toBe(3);
    expect(routine.exercises[0].weightKg).toBe(85);
    expect(routine.exercises[0].supersetGroup).toBe('A');
  });

  it('exports to string and safely parses back without overwriting IDs', () => {
    const bundle: PlanBundle = {
      version: 1,
      name: 'FBW Plan',
      createdIso: '2026-09-21',
      author: 'Jakub',
      routines: [
        exercisesToExportedRoutine('Góra A', sampleExercises),
      ],
    };

    const encoded = exportPlanBundleToString(bundle);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(10);

    const { bundle: importedBundle, exercises: importedExs } = parseAndMergePlanBundle(encoded);
    expect(importedBundle.name).toBe('FBW Plan');
    expect(importedExs).toHaveLength(2);

    // Merge-safety check: IDs must be unique and not match 101 or 102
    expect(importedExs[0].id).not.toBe(101);
    expect(importedExs[1].id).not.toBe(102);
    expect(importedExs[0].name).toBe('Wyciskanie leżąc');
    expect(importedExs[0].sets).toHaveLength(3);
    expect(importedExs[0].sets[0].id).not.toBe(1);
    expect(importedExs[0].supersetGroup).toBe('A');
  });
});
