import { Pressable } from '../../ui/ControlPrimitives';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Trash2, Plus, TrendingUp } from 'lucide-react';
import { Card } from '../../ui/Card';
import {
  WorkoutExercise,
  useExerciseHistory,
  newSet,
  epley,
  formatLastSession,
} from './workoutUtils';
import ExerciseNameInput from './ExerciseNameInput';
import ExerciseWellnessSets from './ExerciseWellnessSets';
import ExerciseStrengthSets from './ExerciseStrengthSets';
import { useHaptics } from '../../../hooks/useHaptics';
import { getTodayWarsaw } from '../../../lib/date';
import { confirmDialog } from '../../../lib/notify';
import { matchedHistoryAlias } from '../../../lib/health/exerciseHistoryAliases';
import { intraSessionFatigueIndex } from '@vanguard/domain';
import {
  computeExerciseSuggestion,
  formatSuggestionShort,
  isBodyweightExercise,
  suggestionProgressed,
  suggestionReason,
  suggestionRegressed,
} from '../../../lib/health/exerciseSuggestion';
import {
  applySuggestionToSets,
  fillAllSetsFromHistory,
  fillSetFromHistory,
  sortedHistorySets,
} from '../../../lib/health/workoutSetFill';
import type { ExerciseHistoryRow } from '../../../lib/health/workout';

function openExerciseProgress(
  navigate: ReturnType<typeof useNavigate>,
  exerciseName: string,
) {
  const trimmed = exerciseName.trim();
  if (!trimmed) return;
  navigate(
    { pathname: '/cwiczenie', search: `?n=${encodeURIComponent(trimmed)}` },
    { state: { exerciseName: trimmed } },
  );
}

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  onChange: (ex: WorkoutExercise) => void;
  onRemove: () => void;
  userId: string | undefined;
}

export default function ExerciseCard({
  exercise,
  onChange,
  onRemove,
  userId,
}: ExerciseCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const haptics = useHaptics();
  const navigate = useNavigate();
  const sets = exercise.sets ?? [];
  const tags = exercise.tags ?? [];
  const isSaunaMode = tags.includes('wellness');
  const { lastSession, lastSessionDate, allTimeBest1RM } = useExerciseHistory(exercise.name ?? '', userId);
  const lastSessionRows = lastSession ? sortedHistorySets(lastSession) : [];
  const daysAgo = lastSessionDate
    ? Math.round((new Date(`${getTodayWarsaw()}T12:00:00Z`).getTime() - new Date(`${lastSessionDate}T12:00:00Z`).getTime()) / 86400000)
    : null;

  const suggestion = lastSession
    ? computeExerciseSuggestion(lastSession, exercise.name ?? '', tags)
    : null;

  function addSet() {
    haptics.light();
    const last = sets[sets.length - 1];
    onChange({
      ...exercise,
      sets: [
        ...exercise.sets,
        { ...newSet(), kg: last ? last.kg : '', reps: last ? last.reps : '', rir: last ? last.rir : '' },
      ],
    });
  }

  async function removeSet(id: number) {
    if (sets.length <= 1) return;
    const set = sets.find((s) => s.id === id);
    const hasData = !!(set?.kg || set?.reps);
    if (hasData && !(await confirmDialog('Usunąć tę serię?'))) return;
    haptics.light();
    onChange({ ...exercise, sets: sets.filter((s) => s.id !== id) });
  }

  async function removeExercise() {
    const hasData = sets.some((s) => s.kg || s.reps);
    if (hasData && !(await confirmDialog(`Usunąć ćwiczenie "${exercise.name || 'bez nazwy'}" wraz z seriami?`))) return;
    onRemove();
  }

  function updateSet(id: number, field: string, value: string | boolean) {
    onChange({ ...exercise, sets: sets.map((s) => (s.id === id ? { ...s, [field]: value } : s)) });
  }

  function fillFromHistory() {
    if (!lastSession?.length) return;
    haptics.light();
    onChange({ ...exercise, sets: fillAllSetsFromHistory(sets, lastSession) });
  }

  function fillFromSuggestion() {
    if (!lastSession?.length || !suggestion) return;
    haptics.light();
    onChange({
      ...exercise,
      sets: applySuggestionToSets(sets, lastSession, suggestion),
    });
  }

  function fillSet(setId: number, row: ExerciseHistoryRow) {
    haptics.light();
    onChange({
      ...exercise,
      sets: sets.map((s) => (s.id === setId ? fillSetFromHistory(s, row) : s)),
    });
  }

  const hasWeightedInput = sets.some((s) => parseFloat(s.kg) > 0);
  const bwOnlyExercise = isBodyweightExercise(exercise.name ?? '') && !hasWeightedInput;

  const current1RM = bwOnlyExercise
    ? 0
    : sets.reduce((best, s) => {
        const e = epley(s.kg, s.reps);
        return e && e > best ? e : best;
      }, 0);

  const historyAlias =
    lastSession?.[0]?.exercise_name && exercise.name
      ? matchedHistoryAlias(exercise.name, lastSession[0].exercise_name)
      : null;

  const lastFatigue = lastSessionRows.length
    ? intraSessionFatigueIndex(
        lastSessionRows.map((s) => ({
          weight: Number(s.weight) || 0,
          reps: Number(s.reps) || 0,
          set_number: s.set_number ?? 0,
        })),
      )
    : null;

  return (
    <Card variant="surface" className="border border-border-custom" padding="0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-custom bg-text-primary/[0.01]">
        <ExerciseNameInput
          value={exercise.name}
          tags={exercise.tags}
          onChange={(name, t) => onChange({ ...exercise, name, tags: t })}
        />
        {exercise.name.trim().length >= 2 && !isSaunaMode && (
          <Pressable
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openExerciseProgress(navigate, exercise.name);
            }}
            className="relative z-10 shrink-0 flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
            title="Progres ćwiczenia"
            aria-label="Progres ćwiczenia"
          >
            <TrendingUp size={16} />
          </Pressable>
        )}
        <Pressable
          onClick={() => setCollapsed((c) => !c)}
          className="p-1 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </Pressable>
        <Pressable
          onClick={removeExercise}
          className="p-1 text-text-muted hover:text-danger transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
        </Pressable>
      </div>

      {lastSession && !isSaunaMode && (
        <div className="flex items-center gap-2 border-t border-border-custom bg-text-primary/[0.01] px-4 py-2">
          <Pressable
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              fillFromHistory();
            }}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg py-0.5 cursor-pointer hover:bg-primary/5 transition-colors"
            title="Wstaw wszystkie serie z ostatniej sesji"
          >
            <span className="text-2xs font-black uppercase tracking-widest text-text-muted shrink-0">Ostatnio</span>
            <span className="text-xs font-bold text-text-secondary truncate">{formatLastSession(lastSession)}</span>
            {daysAgo != null && (
              <span className="text-2xs font-bold text-text-muted/50 shrink-0">
                {daysAgo === 0 ? '(dziś)' : daysAgo === 1 ? '(1d temu)' : `(${daysAgo}d temu)`}
                {historyAlias ? ` · jako ${historyAlias}` : ''}
              </span>
            )}
          </Pressable>
          {suggestion && (
            <Pressable
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                fillFromSuggestion();
              }}
              className={`shrink-0 text-xs font-black rounded-lg px-2 py-1 ${
                suggestionProgressed(suggestion)
                  ? 'text-success bg-success/10'
                  : suggestionRegressed(suggestion)
                    ? 'text-warning bg-warning/10'
                    : 'text-text-secondary bg-surface'
              }`}
              title={suggestionReason(suggestion)}
            >
              {formatSuggestionShort(suggestion)}
            </Pressable>
          )}
          {lastFatigue && lastFatigue.repDropPct >= 5 && (
            <span className="text-2xs font-bold text-warning shrink-0" title={lastFatigue.message}>
              ↓{lastFatigue.repDropPct}%
            </span>
          )}
        </div>
      )}

      {!collapsed && (
        <div className="px-4 pb-3 pt-2 space-y-2">
          {isSaunaMode ? (
            <ExerciseWellnessSets exercise={exercise} haptics={haptics} updateSet={updateSet} removeSet={removeSet} />
          ) : (
            <ExerciseStrengthSets
              exercise={exercise}
              haptics={haptics}
              allTimeBest1RM={bwOnlyExercise ? null : allTimeBest1RM}
              lastSessionRows={lastSessionRows}
              onFillSet={fillSet}
              updateSet={updateSet}
              removeSet={removeSet}
            />
          )}

          <Pressable
            onClick={addSet}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-custom bg-surface/30 py-2 text-xs font-black uppercase tracking-widest text-text-muted hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
          >
            <Plus size={11} /> Dodaj serię
          </Pressable>

          {!isSaunaMode && !bwOnlyExercise && current1RM > 0 && (
            <div className="flex justify-between items-center pt-1.5 border-t border-border-custom mt-2">
              <span className="text-2xs font-black text-text-secondary uppercase tracking-wider">
                Objętość:{' '}
                {sets
                  .reduce((sum, s) => sum + (parseFloat(s.kg) || 0) * (parseInt(s.reps) || 0), 0)
                  .toLocaleString()}{' '}
                kg
              </span>
              <span className="text-2xs font-black text-text-muted tabular-nums">
                ~{current1RM.toFixed(1)} kg 1RM
              </span>
            </div>
          )}

          {!isSaunaMode && bwOnlyExercise && (
            <p className="text-2xs text-text-muted pt-1 border-t border-border-custom">
              Progres BW — licz powtórzenia, nie e1RM.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
