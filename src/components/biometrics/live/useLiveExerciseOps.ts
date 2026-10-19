import { useCallback, useState } from 'react';
import { confirmDialog } from '../../../lib/notify';
import { newExercise, newSet, type WorkoutExercise } from '../workout/workoutUtils';
import type { useWorkoutLogger } from '../hooks/useWorkoutLogger';
import { isSetLogged } from './liveWorkoutUtils';

const DEFAULT_SETS = 1;

type Logger = ReturnType<typeof useWorkoutLogger>;

/** Operacje na liście ćwiczeń: dodanie, zamiana, przesunięcie, usunięcie (z potwierdzeniem i cofnięciem). */
export function useLiveExerciseOps(logger: Logger, exercises: WorkoutExercise[], setActiveId: (id: number | null) => void) {
  const [swapId, setSwapId] = useState<number | null>(null);
  const [undo, setUndo] = useState<{ message: string; run: () => void } | null>(null);
  const expireUndo = useCallback(() => setUndo(null), []);

  const pickExercise = (name: string, tags: string[]) => {
    if (swapId != null) {
      const id = swapId;
      setSwapId(null);
      logger.setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, name, tags, sets: [newSet()] } : e)));
      return;
    }
    const created = { ...newExercise(), name, tags, sets: Array.from({ length: DEFAULT_SETS }, () => newSet()) };
    logger.setExercises((prev) => [...prev.filter((e) => e.name.trim()), created]);
    setActiveId(created.id);
  };

  /** Zamiana ćwiczenia czyści serie — jeśli coś już zaliczono, pytamy najpierw. */
  const requestSwap = async (id: number, openPicker: () => void) => {
    const target = logger.exercises.find((e) => e.id === id);
    const logged = target ? target.sets.filter(isSetLogged).length : 0;
    if (logged > 0 && !(await confirmDialog(`Zamiana ćwiczenia usunie ${logged} zaliczonych serii. Kontynuować?`))) return;
    setSwapId(id);
    openPicker();
  };

  const advanceFrom = (id: number) => {
    const idx = exercises.findIndex((e) => e.id === id);
    const next = exercises.slice(idx + 1).find((e) => e.sets.some((s) => !s.done));
    if (next) window.setTimeout(() => setActiveId(next.id), 450);
  };

  const removeExercise = async (id: number) => {
    const target = logger.exercises.find((e) => e.id === id);
    if (!target) return;
    const logged = target.sets.filter(isSetLogged).length;
    if (logged > 0 && !(await confirmDialog(`Usunąć „${target.name}” razem z ${logged} zaliczonymi seriami?`))) return;
    const index = logger.exercises.findIndex((e) => e.id === id);
    logger.setExercises((prev) => prev.filter((e) => e.id !== id));
    setUndo({
      message: `Usunięto: ${target.name}`,
      run: () =>
        logger.setExercises((prev) => {
          const next = [...prev];
          next.splice(Math.min(index, next.length), 0, target);
          return next;
        }),
    });
  };

  const moveExercise = (id: number, direction: 'up' | 'down') => {
    logger.setExercises((prev) => {
      const valid = prev.filter((e) => e.name.trim());
      const idx = valid.findIndex((e) => e.id === id);
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (idx === -1 || target < 0 || target >= valid.length) return prev;
      const next = [...valid];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  return { swapId, setSwapId, requestSwap, undo, setUndo, expireUndo, pickExercise, advanceFrom, removeExercise, moveExercise };
}
