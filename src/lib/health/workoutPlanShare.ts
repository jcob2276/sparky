/**
 * @file workoutPlanShare.ts
 * @role Moduł udostępniania i bezpiecznego importu planów treningowych adaptowany z openGym.
 * Generuje zwarty ciąg URL-safe / QR Code i wykonuje merge-safe import (nigdy nie nadpisuje istniejących ID).
 */

import type { WorkoutExercise } from './workout';

export interface ExportedRoutine {
  name: string;
  notes?: string;
  category?: string;
  exercises: Array<{
    name: string;
    sets: number;
    targetReps?: number | string;
    targetRir?: number;
    weightKg?: number;
    mode?: 'reps' | 'timed';
    supersetGroup?: string;
  }>;
}

export interface PlanBundle {
  version: 1;
  createdIso: string;
  author?: string;
  name: string;
  routines: ExportedRoutine[];
}

/**
 * Konwertuje aktywne ćwiczenia sesji do formatu eksportu planu.
 */
export function exercisesToExportedRoutine(name: string, exercises: WorkoutExercise[], notes?: string): ExportedRoutine {
  return {
    name,
    notes,
    exercises: exercises
      .filter((e) => e.name.trim())
      .map((e) => {
        const firstSet = e.sets[0];
        return {
          name: e.name,
          sets: e.sets.length,
          targetReps: firstSet?.reps || '8-10',
          targetRir: firstSet?.rir ? Number(firstSet.rir) : 2,
          weightKg: firstSet?.kg ? Number(firstSet.kg) : undefined,
          mode: e.mode,
          supersetGroup: e.supersetGroup,
        };
      }),
  };
}

/**
 * Serializuje pakiet planu do bezpiecznego ciągu Base64 / URL string.
 */
export function exportPlanBundleToString(bundle: PlanBundle): string {
  const jsonStr = JSON.stringify(bundle);
  if (typeof btoa !== 'undefined') {
    return btoa(encodeURIComponent(jsonStr));
  }
  return Buffer.from(encodeURIComponent(jsonStr)).toString('base64');
}

/**
 * Bezpieczny import planu (Merge-Safe):
 * Przypisuje nowe losowe ID wszystkim ćwiczeniom i seriom, zapobiegając nadpisaniu danych użytkownika.
 */
export function parseAndMergePlanBundle(rawString: string): { bundle: PlanBundle; exercises: WorkoutExercise[] } {
  let jsonStr: string;
  try {
    if (typeof atob !== 'undefined') {
      jsonStr = decodeURIComponent(atob(rawString.trim()));
    } else {
      jsonStr = decodeURIComponent(Buffer.from(rawString.trim(), 'base64').toString('utf8'));
    }
  } catch {
    // Spróbuj sparsować bezpośrednio jako JSON
    jsonStr = rawString.trim();
  }

  const parsed = JSON.parse(jsonStr) as PlanBundle;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.routines)) {
    throw new Error('Nieprawidłowy format planu treningowego Sparky/openGym.');
  }

  const allExercises: WorkoutExercise[] = [];

  for (const routine of parsed.routines) {
    for (const re of routine.exercises || []) {
      const setsCount = Math.max(1, re.sets || 3);
      const exerciseId = Date.now() + Math.random();

      allExercises.push({
        id: exerciseId,
        name: re.name,
        tags: [],
        mode: re.mode,
        supersetGroup: re.supersetGroup,
        sets: Array.from({ length: setsCount }).map(() => ({
          id: Date.now() + Math.random(),
          kg: re.weightKg != null ? String(re.weightKg) : '',
          reps: re.targetReps != null ? String(re.targetReps) : '8',
          rir: re.targetRir != null ? String(re.targetRir) : '2',
          msp: false,
          type: 'working',
        })),
      });
    }
  }

  return { bundle: parsed, exercises: allExercises };
}
