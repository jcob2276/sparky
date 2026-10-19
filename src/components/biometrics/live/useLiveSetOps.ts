import { useEffect, useRef, useState } from 'react';
import { useHaptics } from '../../../hooks/useHaptics';
import { newSet, type WorkoutExercise, type WorkoutSet } from '../workout/workoutUtils';
import { canComplete, createToggleGuard, defaultRestSeconds, warmupRamp, type SetGhost } from './liveWorkoutUtils';

interface Options {
  exercise: WorkoutExercise;
  onChange: (exercise: WorkoutExercise) => void;
  ghostOf: (set: WorkoutSet, idx: number) => SetGhost | null;
  /** Ciężar docelowy do rampy rozgrzewkowej, gdy seria robocza jeszcze go nie ma. */
  fallbackKg: number;
  onUndoable?: (message: string, undo: () => void) => void;
  onSetDone: (restSeconds: number) => void;
  onSetUndone?: () => void;
  onAllDone: () => void;
}

/** Operacje na seriach jednego ćwiczenia: zaliczanie (z zabezpieczeniami), dodawanie, duplikowanie, usuwanie z możliwością cofnięcia. */
export function useLiveSetOps({ exercise, onChange, ghostOf, fallbackKg, onUndoable, onSetDone, onSetUndone, onAllDone }: Options) {
  const haptics = useHaptics();
  const [rirSetId, setRirSetId] = useState<number | null>(null);
  const [actionsSetId, setActionsSetId] = useState<number | null>(null);
  const [needsRepsId, setNeedsRepsId] = useState<number | null>(null);
  const guardRef = useRef(createToggleGuard());
  const exerciseRef = useRef(exercise);
  useEffect(() => {
    exerciseRef.current = exercise;
  });

  const sets = exercise.sets;
  const workingNumber = (idx: number) => sets.slice(0, idx + 1).filter((s) => s.type !== 'warmup').length;

  const patchSet = (id: number, patch: Partial<WorkoutSet>) =>
    onChange({ ...exercise, sets: sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  const toggleDone = (idx: number) => {
    const set = sets[idx];
    if (!guardRef.current.pass()) return;
    if (set.done) {
      haptics.light();
      patchSet(set.id, { done: false });
      onSetUndone?.();
      return;
    }
    const ghost = ghostOf(set, idx);
    if (!canComplete(set, ghost)) {
      haptics.error();
      setNeedsRepsId(set.id);
      return;
    }
    haptics.light();
    setNeedsRepsId(null);
    patchSet(set.id, {
      done: true,
      kg: set.kg.trim() ? set.kg : ghost?.kg ?? '',
      reps: set.reps.trim() ? set.reps : ghost?.reps ?? '',
    });
    setRirSetId(set.type === 'warmup' || set.rir.trim() ? null : set.id);
    if (set.type !== 'warmup') onSetDone(defaultRestSeconds(exercise.name));
    if (sets.every((s) => s.id === set.id || s.done)) onAllDone();
  };

  const addSet = (type: WorkoutSet['type'] = 'working') => {
    haptics.light();
    const created: WorkoutSet = newSet(type);
    onChange({ ...exercise, sets: type === 'warmup' ? [created, ...sets] : [...sets, created] });
  };

  const addWarmup = () => {
    const working = sets.find((s) => s.type !== 'warmup');
    const target = parseFloat(working?.kg ?? '') || fallbackKg;
    const ramp = warmupRamp(target);
    if (!ramp.length) return addSet('warmup');
    haptics.light();
    onChange({ ...exercise, sets: [...ramp.map((g) => ({ ...newSet('warmup'), kg: g.kg, reps: g.reps })), ...sets] });
  };

  const removeSetAt = (idx: number) => {
    if (sets.length <= 1) return;
    const removed = sets[idx];
    haptics.light();
    setActionsSetId(null);
    if (removed.done) onSetUndone?.();
    onChange({ ...exercise, sets: sets.filter((s) => s.id !== removed.id) });
    onUndoable?.(`Usunięto serię ${removed.type === 'warmup' ? '(rozgrzewka)' : workingNumber(idx)}`, () => {
      const latest = exerciseRef.current;
      if (latest.sets.some((s) => s.id === removed.id)) return;
      const next = [...latest.sets];
      next.splice(Math.min(idx, next.length), 0, removed);
      onChange({ ...latest, sets: next });
    });
  };

  const duplicateSet = (idx: number) => {
    haptics.light();
    const source = sets[idx];
    const next = [...sets];
    next.splice(idx + 1, 0, { ...newSet(source.type), kg: source.kg, reps: source.reps });
    onChange({ ...exercise, sets: next });
  };

  return {
    rirSetId,
    setRirSetId,
    actionsSetId,
    setActionsSetId,
    needsRepsId,
    setNeedsRepsId,
    workingNumber,
    patchSet,
    toggleDone,
    addSet,
    addWarmup,
    removeSetAt,
    duplicateSet,
  };
}
