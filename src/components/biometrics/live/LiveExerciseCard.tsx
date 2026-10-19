import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MoreHorizontal, Plus } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import { useHaptics } from '../../../hooks/useHaptics';
import { useExerciseVisual } from '../../../lib/health/exerciseImages';
import { sortedHistorySets } from '../../../lib/health/workoutSetFill';
import { computeExerciseSuggestion } from '../../../lib/health/exerciseSuggestion';
import { newSet, useExerciseHistory, type WorkoutExercise, type WorkoutSet } from '../workout/workoutUtils';
import ExerciseThumb from '../workout/ExerciseThumb';
import BarbellPlatesPanel from '../workout/BarbellPlatesPanel';
import LiveSetRow from './LiveSetRow';
import LiveExerciseMenu from './LiveExerciseMenu';
import LiveRirChips from './LiveRirChips';
import { defaultRestSeconds, ghostForSet, isPersonalRecord, isSetLogged, warmupRamp, type SetGhost } from './liveWorkoutUtils';

interface Props {
  exercise: WorkoutExercise;
  userId: string | undefined;
  active: boolean;
  onActivate: () => void;
  onChange: (exercise: WorkoutExercise) => void;
  onRemove: () => void;
  /** Po zaliczeniu serii — start przerwy. */
  onSetDone: (restSeconds: number) => void;
  /** Wszystkie serie zaliczone — rodzic przechodzi do następnego ćwiczenia. */
  onAllDone: () => void;
}

const BARBELL_NAME = /sztang|martwy ci[aą]g|wyciskanie p[lł]askie|wyciskanie sko[sś]ne|przysiad/i;

export default function LiveExerciseCard({ exercise, userId, active, onActivate, onChange, onRemove, onSetDone, onAllDone }: Props) {
  const navigate = useNavigate();
  const haptics = useHaptics();
  const visual = useExerciseVisual(exercise.name);
  const { lastSession, allTimeBest1RM } = useExerciseHistory(exercise.name, userId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [platesOpen, setPlatesOpen] = useState(false);
  const [rirSetId, setRirSetId] = useState<number | null>(null);

  const history = lastSession ? sortedHistorySets(lastSession) : [];
  const suggestion = lastSession ? computeExerciseSuggestion(lastSession, exercise.name, exercise.tags) : null;
  const suggestedKg = suggestion && suggestion.mode !== 'reps' ? String(suggestion.weight.suggestedWeight) : null;
  const ghostOf = (set: WorkoutSet, idx: number): SetGhost | null => {
    const base = ghostForSet(history, idx, set);
    if (!base || !suggestedKg || set.type === 'warmup') return base;
    return { ...base, kg: suggestedKg };
  };
  const isBarbell = visual?.isBarbell === true || BARBELL_NAME.test(exercise.name);
  const sets = exercise.sets;
  const doneCount = sets.filter(isSetLogged).length;
  const workingNumber = (idx: number) => sets.slice(0, idx + 1).filter((s) => s.type !== 'warmup').length;
  const nextIdx = sets.findIndex((s) => !s.done);

  const patchSet = (id: number, patch: Partial<WorkoutSet>) =>
    onChange({ ...exercise, sets: sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  const toggleDone = (idx: number) => {
    const set = sets[idx];
    haptics.light();
    if (set.done) {
      patchSet(set.id, { done: false });
      return;
    }
    const ghost = ghostOf(set, idx);
    patchSet(set.id, {
      done: true,
      kg: set.kg.trim() ? set.kg : ghost?.kg ?? '',
      reps: set.reps.trim() ? set.reps : ghost?.reps ?? '',
    });
    setRirSetId(set.rir.trim() ? null : set.id);
    onSetDone(defaultRestSeconds(exercise.name));
    if (sets.every((s) => s.id === set.id || s.done)) onAllDone();
  };

  const addWarmup = () => {
    haptics.light();
    const working = sets.find((s) => s.type !== 'warmup');
    const target = parseFloat(working?.kg ?? '') || parseFloat(suggestedKg ?? '') || parseFloat(ghostForSet(history, 0, working ?? sets[0])?.kg ?? '') || 0;
    const ramp = warmupRamp(target);
    if (!ramp.length) return addSet('warmup');
    onChange({ ...exercise, sets: [...ramp.map((g) => ({ ...newSet('warmup'), kg: g.kg, reps: g.reps })), ...sets] });
  };

  const addSet = (type: WorkoutSet['type'] = 'working') => {
    haptics.light();
    const last = [...sets].reverse().find((s) => s.type !== 'warmup');
    const created: WorkoutSet = { ...newSet(type), kg: type === 'warmup' ? '' : last?.kg ?? '', reps: type === 'warmup' ? '' : last?.reps ?? '' };
    onChange({ ...exercise, sets: type === 'warmup' ? [created, ...sets] : [...sets, created] });
  };

  const removeLastSet = () => {
    if (sets.length > 1) onChange({ ...exercise, sets: sets.slice(0, -1) });
  };

  const hint = suggestion && suggestion.mode !== 'reps' ? suggestion.weight : null;
  const subtitle = [visual?.equipment ?? (isBarbell ? 'Sztanga' : null), `${doneCount}/${sets.length} serii`].filter(Boolean).join(' · ');
  const platesTarget = sets[nextIdx >= 0 ? nextIdx : sets.length - 1];

  return (
    <section className={`rounded-3xl border bg-surface transition-colors ${active ? 'border-primary/40 shadow-sm' : 'border-border-custom'}`}>
      <div className="flex items-center gap-3 p-3">
        <Pressable onClick={onActivate} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={active} aria-label={`${exercise.name}, ${subtitle}`}>
          <ExerciseThumb name={exercise.name} size={active ? 'lg' : 'md'} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-lg font-bold leading-tight text-text-primary">{exercise.name}</span>
            <span className="block truncate text-xs font-medium text-text-muted">{subtitle}</span>
          </span>
        </Pressable>
        {active ? (
          <div className="relative shrink-0">
            <Pressable onClick={() => setMenuOpen((v) => !v)} aria-label="Więcej opcji ćwiczenia" className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary hover:bg-surface-2">
              <MoreHorizontal size={20} />
            </Pressable>
            {menuOpen && (
              <LiveExerciseMenu
                canPlates={isBarbell}
                onClose={() => setMenuOpen(false)}
                onWarmup={addWarmup}
                onPlates={() => setPlatesOpen((v) => !v)}
                onProgress={() => navigate({ pathname: '/cwiczenie', search: `?n=${encodeURIComponent(exercise.name)}` })}
                onRemoveSet={removeLastSet}
                onRemove={onRemove}
              />
            )}
          </div>
        ) : (
          <ChevronDown size={18} className="shrink-0 text-text-muted" aria-hidden />
        )}
      </div>

      {active && (
        <div className="space-y-1 px-2 pb-3">
          {hint && (
            <p className="mx-1 mb-1 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              Dziś celuj w {String(hint.suggestedWeight).replace('.', ',')} kg{hint.action === 'progress' ? ' ↑' : ''} · {hint.reason}
            </p>
          )}
          <div className="grid grid-cols-[2.25rem_1fr_1fr_2.75rem] gap-2 px-1.5 pb-0.5 text-2xs font-bold uppercase tracking-wider text-text-muted">
            <span />
            <span className="text-center">kg</span>
            <span className="text-center">powt.</span>
            <span />
          </div>
          {sets.map((set, idx) => (
            <div key={set.id}>
              <LiveSetRow
                set={set}
                number={workingNumber(idx)}
                ghost={ghostOf(set, idx)}
                isNext={idx === nextIdx}
                weightStep={2.5}
                isPr={isPersonalRecord(set, allTimeBest1RM)}
                onChange={(patch) => patchSet(set.id, patch)}
                onToggleDone={() => toggleDone(idx)}
              />
              {rirSetId !== set.id && set.done && set.rir.trim() !== '' && (
                <Pressable onClick={() => setRirSetId(set.id)} className="mx-2 mb-1 text-2xs font-bold text-text-muted" aria-label="Zmień RPE serii">
                  RPE {10 - Number(set.rir)} · {set.rir} w zapasie
                </Pressable>
              )}
              {rirSetId === set.id && set.done && (
                <LiveRirChips value={set.rir} onPick={(rir, rpe) => { patchSet(set.id, { rir, rpe }); setRirSetId(null); }} onDismiss={() => setRirSetId(null)} />
              )}
              {platesOpen && platesTarget?.id === set.id && (
                <div className="px-1 py-2">
                  <BarbellPlatesPanel kg={set.kg || ghostOf(set, idx)?.kg || ''} onChange={(kg) => patchSet(set.id, { kg })} onClose={() => setPlatesOpen(false)} />
                </div>
              )}
            </div>
          ))}
          <Pressable
            onClick={() => addSet()}
            className="mx-1 mt-1 flex h-11 w-[calc(100%-0.5rem)] items-center justify-center gap-1.5 rounded-2xl text-sm font-bold text-primary hover:bg-primary/10"
          >
            <Plus size={16} /> Seria
          </Pressable>
        </div>
      )}
    </section>
  );
}
