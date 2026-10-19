import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import { useExerciseVisual } from '../../../lib/health/exerciseImages';
import { sortedHistorySets } from '../../../lib/health/workoutSetFill';
import { computeExerciseSuggestion } from '../../../lib/health/exerciseSuggestion';
import { useExerciseHistory, type WorkoutExercise, type WorkoutSet } from '../workout/workoutUtils';
import BarbellPlatesPanel from '../workout/BarbellPlatesPanel';
import LiveSetRow from './LiveSetRow';
import LiveRirChips from './LiveRirChips';
import LiveSetActions from './LiveSetActions';
import { useLiveSetOps } from './useLiveSetOps';
import LiveExerciseHeader from './LiveExerciseHeader';
import { ghostForSet, isPersonalRecord, type SetGhost } from './liveWorkoutUtils';

interface Props {
  exercise: WorkoutExercise;
  userId: string | undefined;
  active: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onActivate: () => void;
  onChange: (exercise: WorkoutExercise) => void;
  onRemove: () => void;
  onSwap?: () => void;
  /** Po usunięciu serii — pasek „Cofnij”. */
  onUndoable?: (message: string, undo: () => void) => void;
  /** Po zaliczeniu serii — start przerwy. */
  onSetDone: (restSeconds: number) => void;
  /** Cofnięcie ✓ — przerwa po tej serii przestaje mieć sens. */
  onSetUndone?: () => void;
  /** Wszystkie serie zaliczone — rodzic przechodzi do następnego ćwiczenia. */
  onAllDone: () => void;
}

const STEPS = [1, 2.5, 5];
const CONFIRM_MS = 4000;

const BARBELL_NAME = /sztang|martwy ci[aą]g|wyciskanie p[lł]askie|wyciskanie sko[sś]ne|przysiad/i;

function LiveSetFooter({
  canRemove,
  lastHasData,
  step,
  onAdd,
  onRemove,
  onCycleStep,
}: {
  canRemove: boolean;
  lastHasData: boolean;
  step: number;
  onAdd: () => void;
  onRemove: () => void;
  onCycleStep: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = window.setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => window.clearTimeout(t);
  }, [confirming]);
  const stepText = String(step).replace('.', ',');
  return (
    <div className="flex items-center gap-2 px-1 pt-1">
      <Pressable
        type="button"
        onClick={onAdd}
        className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-surface-2 text-sm font-bold text-primary hover:bg-primary/10 active:scale-95 transition-all"
        aria-label="Dodaj serię"
      >
        <Plus size={16} /> Dodaj serię
      </Pressable>
      {canRemove && (
        <Pressable
          type="button"
          onClick={() => {
            if (!lastHasData || confirming) {
              setConfirming(false);
              onRemove();
            } else setConfirming(true);
          }}
          className={`flex h-11 items-center justify-center gap-1.5 rounded-2xl px-4 text-xs font-bold active:scale-95 transition-all ${
            confirming ? 'bg-danger text-on-accent' : 'bg-surface-2 text-text-muted hover:text-danger hover:bg-danger/10'
          }`}
          aria-label={confirming ? 'Potwierdź usunięcie ostatniej serii' : 'Usuń ostatnią serię'}
        >
          <Minus size={15} /> {confirming ? 'Na pewno?' : 'Usuń serię'}
        </Pressable>
      )}
      <Pressable
        type="button"
        onClick={onCycleStep}
        aria-label={`Skok ciężaru ${stepText} kg, zmień`}
        className="h-11 shrink-0 rounded-2xl border border-border-custom px-3 text-xs font-bold text-text-secondary"
      >
        ±{stepText} kg
      </Pressable>
    </div>
  );
}

export default function LiveExerciseCard({
  exercise,
  userId,
  active,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onActivate,
  onChange,
  onRemove,
  onSwap,
  onUndoable,
  onSetDone,
  onSetUndone,
  onAllDone,
}: Props) {
  const navigate = useNavigate();
  const visual = useExerciseVisual(exercise.name);
  const { lastSession, allTimeBest1RM } = useExerciseHistory(exercise.name, userId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [platesOpen, setPlatesOpen] = useState(false);
  const [step, setStep] = useState(2.5);
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
  const workingSets = sets.filter((s) => s.type !== 'warmup');
  const doneCount = workingSets.filter((s) => s.done).length;
  const nextIdx = sets.findIndex((s) => !s.done);

  const ops = useLiveSetOps({
    exercise,
    onChange,
    ghostOf,
    fallbackKg: parseFloat(suggestedKg ?? '') || parseFloat(ghostForSet(history, 0, sets[0])?.kg ?? '') || 0,
    onUndoable,
    onSetDone,
    onSetUndone,
    onAllDone,
  });
  const { rirSetId, setRirSetId, actionsSetId, setActionsSetId, needsRepsId, setNeedsRepsId, workingNumber, patchSet, toggleDone, addSet, addWarmup, removeSetAt, duplicateSet } = ops;
  const removeLastSet = () => removeSetAt(sets.length - 1);

  const lastSet = sets[sets.length - 1];
  const lastHasData = Boolean(lastSet && (lastSet.done || lastSet.kg.trim() || lastSet.reps.trim()));

  const hint = suggestion && suggestion.mode !== 'reps' ? suggestion.weight : null;
  const subtitle = [visual?.equipment ?? (isBarbell ? 'Sztanga' : null), `${doneCount}/${workingSets.length} serii`].filter(Boolean).join(' · ');
  const platesTarget = sets[nextIdx >= 0 ? nextIdx : sets.length - 1];

  return (
    <section className={`rounded-3xl border bg-surface transition-colors ${active ? 'border-primary/40 shadow-sm' : 'border-border-custom'}`}>
      <LiveExerciseHeader
        name={exercise.name}
        subtitle={subtitle}
        active={active}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        isBarbell={isBarbell}
        menuOpen={menuOpen}
        onActivate={onActivate}
        onToggleMenu={() => setMenuOpen((v) => !v)}
        onCloseMenu={() => setMenuOpen(false)}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onWarmup={addWarmup}
        onPlates={() => setPlatesOpen((v) => !v)}
        onProgress={() => navigate({ pathname: '/cwiczenie', search: `?n=${encodeURIComponent(exercise.name)}` })}
        onRemoveSet={removeLastSet}
        onSwap={onSwap}
        onRemove={onRemove}
      />

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
                weightStep={step}
                isPr={set.type !== 'warmup' && isPersonalRecord(set, allTimeBest1RM)}
                actionsOpen={actionsSetId === set.id}
                needsReps={needsRepsId === set.id}
                onChange={(patch) => {
                  patchSet(set.id, patch);
                  if (patch.reps) setNeedsRepsId(null);
                }}
                onToggleDone={() => toggleDone(idx)}
                onToggleActions={() => setActionsSetId((cur) => (cur === set.id ? null : set.id))}
              />
              {actionsSetId === set.id && (
                <LiveSetActions
                  isWarmup={set.type === 'warmup'}
                  canDelete={sets.length > 1}
                  onToggleWarmup={() => patchSet(set.id, { type: set.type === 'warmup' ? 'working' : 'warmup' })}
                  onDuplicate={() => duplicateSet(idx)}
                  onDelete={() => removeSetAt(idx)}
                  onClose={() => setActionsSetId(null)}
                />
              )}
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
          <LiveSetFooter
            canRemove={sets.length > 1}
            lastHasData={lastHasData}
            step={step}
            onAdd={() => addSet()}
            onRemove={removeLastSet}
            onCycleStep={() => setStep((cur) => STEPS[(STEPS.indexOf(cur) + 1) % STEPS.length])}
          />
        </div>
      )}
    </section>
  );
}
