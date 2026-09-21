import { Pressable, ControlInput } from '../../ui/ControlPrimitives';
import { Trash2, Trophy, Scale } from 'lucide-react';
import type { WorkoutSet } from './workoutUtils';
import { epley } from './workoutUtils';
import type { ExerciseHistoryRow } from '../../../lib/health/workout';
import { isSetEmpty } from '../../../lib/health/workoutSetFill';
import { getEffortBand } from '../../../lib/health/effortScale';

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
      ? 'text-amber-400 bg-amber-400/15 border border-amber-400/40 font-black'
      : setType === 'drop'
        ? 'text-purple-400 bg-purple-400/15 border border-purple-400/40 font-black'
        : setType === 'cluster'
          ? 'text-cyan-400 bg-cyan-400/15 border border-cyan-400/40 font-black'
          : setType === 'failure'
            ? 'text-warning bg-warning/20 border border-warning/50 font-black scale-105'
            : 'text-text-secondary bg-surface border border-border-custom hover:text-text-primary hover:border-primary/40';
  return { badgeLabel, badgeStyle };
}

function formatPrevPill(row: ExerciseHistoryRow | undefined): string {
  if (!row) return '—';
  const w = Number(row.weight);
  const wLabel = Number.isNaN(w) || w === 0 ? 'BW' : `${w}k`;
  return `${wLabel}×${row.reps ?? '—'}`;
}

function getRirStyle(rirVal: string): string {
  if (!rirVal || rirVal.trim() === '') return '';
  const n = parseFloat(rirVal);
  if (isNaN(n)) return '';
  const band = getEffortBand(n);
  if (!band) return '';
  if (band.rir === 0) return '!border-purple-500/50 !text-purple-600 dark:!text-purple-400 !bg-purple-500/10';
  if (band.rir === 0.5) return '!border-rose-500/50 !text-rose-600 dark:!text-rose-400 !bg-rose-500/10';
  if (band.rir === 1) return '!border-orange-500/50 !text-orange-600 dark:!text-orange-400 !bg-orange-500/10';
  if (band.rir === 2) return '!border-yellow-500/50 !text-yellow-600 dark:!text-yellow-400 !bg-yellow-500/10';
  if (band.rir === 3) return '!border-emerald-500/50 !text-emerald-600 dark:!text-emerald-400 !bg-emerald-500/10';
  return '!border-cyan-500/50 !text-cyan-600 dark:!text-cyan-400 !bg-cyan-500/10';
}

const compactNumInput =
  'h-9 w-full bg-surface-solid border border-border-custom rounded-lg text-xs font-bold text-text-primary text-center outline-none focus:border-primary/60 focus:bg-surface-solid focus:shadow-[0_0_0_2px_var(--color-theme-hex-ba7970229008)] ui-interactive placeholder:text-text-muted/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

// eslint-disable-next-line max-lines-per-function
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
    <div className="grid grid-cols-[24px_minmax(64px,74px)_minmax(60px,1fr)_minmax(54px,1fr)_minmax(46px,1fr)_24px] gap-1.5 items-center rounded-xl py-0.5">
      {/* Set Badge */}
      <Pressable
        onClick={cycleType}
        title={`Typ serii: ${setType} (Kliknij: Zwykła -> Rozgrzewka W -> Drop D -> Do załamania ★)`}
        className={`text-xs font-black text-center w-6 h-6 rounded-lg ui-interactive cursor-pointer flex items-center justify-center transition-transform active:scale-90 ${badgeStyle}`}
      >
        {badgeLabel}
      </Pressable>

      {/* Previous session ghost pill */}
      {historyRow ? (
        <Pressable
          onClick={handlePillClick}
          title={`Poprzednio: ${formatPrevPill(historyRow)}${historyRow.rir != null ? ` @ RIR ${historyRow.rir}` : ''} (Kliknij, aby wstawić)`}
          className={`h-9 px-1 rounded-lg border text-2xs font-mono font-bold flex items-center justify-center truncate transition-all cursor-pointer ${
            empty
              ? 'border-dashed border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 active:scale-95'
              : 'border-border-custom bg-surface/50 text-text-muted hover:text-text-primary'
          }`}
        >
          {formatPrevPill(historyRow)}
        </Pressable>
      ) : (
        <div className="h-9 rounded-lg border border-border-custom/40 bg-surface/20 flex items-center justify-center text-3xs font-mono text-text-muted/40">
          —
        </div>
      )}

      {/* KG Input */}
      <div className="relative">
        <ControlInput
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          value={set.kg}
          onChange={(e) => updateSet(set.id, 'kg', e.target.value)}
          placeholder={ghostKg}
          className={compactNumInput}
        />
        {onOpenPlateCalc && (
          <Pressable
            type="button"
            onClick={() =>
              onOpenPlateCalc(parseFloat(set.kg) || (historyRow ? Number(historyRow.weight) || 60 : 60), (w) =>
                updateSet(set.id, 'kg', String(w))
              )
            }
            title="Kalkulator talerzy na gryf"
            className="absolute top-2 right-1 p-0.5 rounded text-text-muted hover:text-primary transition-colors cursor-pointer"
          >
            <Scale size={11} />
          </Pressable>
        )}
      </div>

      {/* Reps / Time Input */}
      <div className="relative">
        <ControlInput
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={set.reps}
          onChange={(e) => updateSet(set.id, 'reps', e.target.value)}
          placeholder={isTimed ? (ghostReps !== '—' ? `${ghostReps}s` : 'sek') : ghostReps}
          title={isTimed ? 'Czas trwania serii (sekundy)' : 'Liczba powtórzeń'}
          className={compactNumInput}
        />
        {isPR && !isTimed && (
          <div
            className="absolute -top-1.5 -right-1.5 bg-warning text-scrim rounded-full p-0.5 pointer-events-none shadow-xs animate-bounce"
            title="Nowy szacowany 1RM (PR)!"
          >
            <Trophy size={9} />
          </div>
        )}
      </div>

      {/* RIR Input */}
      <div>
        <ControlInput
          type="number"
          inputMode="decimal"
          min={0}
          max={5}
          step={0.5}
          value={set.rir}
          onChange={(e) => updateSet(set.id, 'rir', e.target.value)}
          placeholder={ghostRir}
          className={`${compactNumInput} ${getRirStyle(set.rir)}`}
        />
      </div>

      {/* Remove Set */}
      <Pressable
        onClick={() => removeSet(set.id)}
        className="flex items-center justify-center w-6 h-6 text-text-muted/50 hover:text-danger active:scale-90 ui-interactive cursor-pointer transition-colors"
        title="Usuń serię"
      >
        <Trash2 size={13} />
      </Pressable>

      {/* Advanced Set Tags: Drops, Clusters, Sides */}
      {((set.drops && set.drops.length > 0) || (set.clusters && set.clusters.length > 0) || set.sides) && (
        <div className="col-span-6 flex items-center gap-1.5 px-1 py-0.5 text-3xs font-mono">
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
