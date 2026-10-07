import { Pressable } from '../../ui/ControlPrimitives';
import { Trash2, Trophy, Scale } from 'lucide-react';
import type { WorkoutSet } from './workoutUtils';
import { epley } from './workoutUtils';
import type { ExerciseHistoryRow } from '../../../lib/health/workout';
import { isSetEmpty } from '../../../lib/health/workoutSetFill';
import { getEffortBand } from '../../../lib/health/effortScale';
import { WorkoutNumberInput } from './WorkoutNumberInput';

interface StrengthSetRowProps {
  set: WorkoutSet;
  idx: number;
  historyRow: ExerciseHistoryRow | undefined;
  allTimeBest1RM: number | null | undefined;
  haptics: { light: () => void };
  onFillSet: (setId: number, row: ExerciseHistoryRow) => void;
  updateSet: (id: number, field: string, value: string | boolean) => void;
  removeSet: (id: number) => void;
  onOpenPlateCalc?: (initialKg: number, onApply: (kg: number) => void) => void;
  isTimed?: boolean;
  weightStep?: number;
}

function getSetBadgeInfo(setType: string, idx: number) {
  const badgeLabel =
    setType === 'warmup'
      ? 'W'
      : setType === 'drop'
        ? 'D'
        : setType === 'cluster'
          ? 'RP'
          : setType === 'failure'
            ? '★'
            : idx + 1;
  const badgeStyle =
    setType === 'warmup'
      ? 'text-warning bg-warning/15 border border-warning/40 font-black'
      : setType === 'drop'
        ? 'text-attention bg-attention/15 border border-attention/40 font-black'
        : setType === 'cluster'
          ? 'text-info bg-info/15 border border-info/40 font-black'
          : setType === 'failure'
            ? 'text-warning bg-warning/20 border border-warning/50 font-black scale-105'
            : 'text-text-secondary bg-surface border border-border-custom hover:text-text-primary hover:border-primary/40';
  return { badgeLabel, badgeStyle };
}

function formatPrevPill(row: ExerciseHistoryRow | undefined): string {
  if (!row) return '—';
  const w = Number(row.weight);
  const wLabel = Number.isNaN(w) || w === 0 ? 'BW' : `${w} kg`;
  return `${wLabel}×${row.reps ?? '—'}`;
}

function getRirStyle(rirVal: string): string {
  if (!rirVal || rirVal.trim() === '') return '';
  const n = parseFloat(rirVal);
  if (isNaN(n)) return '';
  const band = getEffortBand(n);
  if (!band) return '';
  if (band.rir <= 0.5) return 'border-danger/50 bg-danger/10';
  if (band.rir <= 2) return 'border-warning/50 bg-warning/10';
  return 'border-success/50 bg-success/10';
}

export function StrengthSetRow({
  set,
  idx,
  historyRow,
  allTimeBest1RM,
  haptics,
  onFillSet,
  updateSet,
  removeSet,
  onOpenPlateCalc,
  isTimed,
  weightStep = 2.5,
}: StrengthSetRowProps) {
  const set1RM = epley(set.kg, set.reps);
  const isPR = Boolean(set1RM && allTimeBest1RM && set1RM > allTimeBest1RM);
  const empty = isSetEmpty(set);

  const setType = set.type || (set.msp ? 'failure' : 'working');
  const { badgeLabel, badgeStyle } = getSetBadgeInfo(setType, idx);

  const cycleType = () => {
    haptics.light();
    if (setType === 'working') {
      updateSet(set.id, 'type', 'warmup');
      updateSet(set.id, 'msp', false);
    } else if (setType === 'warmup') {
      updateSet(set.id, 'type', 'drop');
      updateSet(set.id, 'msp', false);
    } else if (setType === 'drop') {
      updateSet(set.id, 'type', 'cluster');
      updateSet(set.id, 'msp', false);
    } else if (setType === 'cluster') {
      updateSet(set.id, 'type', 'failure');
      updateSet(set.id, 'msp', true);
    } else {
      updateSet(set.id, 'type', 'working');
      updateSet(set.id, 'msp', false);
    }
  };

  const handlePillClick = () => {
    if (!historyRow) return;
    haptics.light();
    onFillSet(set.id, historyRow);
  };

  const ghostKg =
    historyRow?.weight != null ? (Number(historyRow.weight) === 0 ? '0' : String(historyRow.weight)) : '—';
  const ghostReps = historyRow?.reps != null ? String(historyRow.reps) : '—';
  const ghostRir = historyRow?.rir != null ? String(historyRow.rir) : '—';

  return (
    <div className="space-y-2 border-b border-border-custom pb-3 last:border-b-0">
      <div className="flex items-center gap-2">
      {/* Set Badge */}
      <Pressable
        onClick={cycleType}
        title={`Typ serii: ${setType} (Kliknij: Zwykła -> Rozgrzewka W -> Drop D -> Do załamania ★)`}
        aria-label={`Typ serii ${idx + 1}: ${setType}`}
        className={`text-sm font-semibold px-2 min-h-11 rounded-lg flex items-center justify-center ${badgeStyle}`}
      >
        Seria {badgeLabel}
      </Pressable>

      {/* Previous session ghost pill */}
      {historyRow ? (
        <Pressable
          onClick={handlePillClick}
          title={`Poprzednio: ${formatPrevPill(historyRow)}${historyRow.rir != null ? ` @ RIR ${historyRow.rir}` : ''} (Kliknij, aby wstawić)`}
          aria-label={`Wstaw poprzednią serię ${idx + 1}`}
          className={`min-h-11 min-w-0 flex-1 px-1 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center ${
            empty
              ? 'border-dashed border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 active:scale-95'
              : 'border-border-custom bg-surface/50 text-text-muted hover:text-text-primary'
          }`}
        >
          <span>Ostatnio:</span> {formatPrevPill(historyRow)}
        </Pressable>
      ) : (
        <span className="min-w-0 flex-1 text-xs text-text-secondary">Pierwsza sesja</span>
      )}
      <div className="ml-auto flex items-center gap-1">
        {onOpenPlateCalc && (
          <Pressable
            type="button"
            onClick={() =>
              onOpenPlateCalc(parseFloat(set.kg) || (historyRow ? Number(historyRow.weight) || 60 : 60), (w) =>
                updateSet(set.id, 'kg', String(w))
              )
            }
            title="Kalkulator talerzy na gryf"
            aria-label={`Kalkulator talerzy, seria ${idx + 1}`}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:text-primary"
          >
            <Scale size={18} />
          </Pressable>
        )}
      {/* Remove Set */}
      <Pressable
        onClick={() => removeSet(set.id)}
        aria-label={`Usuń serię ${idx + 1}`}
        className="flex items-center justify-center w-11 h-11 rounded-lg text-text-secondary hover:text-danger"
        title="Usuń serię"
      >
        <Trash2 size={18} />
      </Pressable>
      </div>
      </div>

      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        <WorkoutNumberInput label="Ciężar" unit="kg" actionLabel="ciężar" series={idx + 1}
          value={set.kg} placeholder={ghostKg} step={weightStep}
          onChange={value => updateSet(set.id, 'kg', value)} />
        <WorkoutNumberInput label={isTimed ? 'Czas (s)' : 'Powtórzenia'} actionLabel={isTimed ? 'czas' : 'powtórzenia'} series={idx + 1}
          value={set.reps} placeholder={ghostReps} step={1} integer
          onChange={value => updateSet(set.id, 'reps', value)} />
        <WorkoutNumberInput label="Zapas (RIR)" actionLabel="zapas" series={idx + 1}
          value={set.rir} placeholder={ghostRir} step={0.5} max={5} inputClassName={getRirStyle(set.rir)}
          onChange={value => updateSet(set.id, 'rir', value)} />
      </div>
      {isPR && !isTimed && <p className="flex items-center gap-1 text-xs text-warning"><Trophy size={14} /> Nowy szacowany rekord 1RM</p>}

      {/* Advanced Set Tags: Drops, Clusters, Sides */}
      {((set.drops && set.drops.length > 0) || (set.clusters && set.clusters.length > 0) || set.sides) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          {set.drops && set.drops.length > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/30">
              +{set.drops.length} drop ({set.drops.map((d) => `${d.kg}k×${d.reps}`).join(', ')})
            </span>
          )}
          {set.clusters && set.clusters.length > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-warning/15 text-warning border border-warning/30">
              klastry: [{set.clusters.map((c) => c.reps).join('+')}]
            </span>
          )}
          {set.sides && (
            <span className="px-1.5 py-0.2 rounded bg-info/15 text-info border border-info/30">
              L: {set.sides.L.kg}k×{set.sides.L.reps} · R: {set.sides.R.kg}k×{set.sides.R.reps}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
