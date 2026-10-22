import { useState } from 'react';
import Sheet from '../../ui/Sheet';
import Button from '../../ui/Button';
import { ControlInput, ControlTextarea, Pressable } from '../../ui/ControlPrimitives';
import type { useWorkoutLogger } from '../hooks/useWorkoutLogger';
import ManualTimePicker from '../workout/ManualTimePicker';
import { autoWorkoutName, countUnchecked, formatKg, summarize } from './liveWorkoutUtils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logger: ReturnType<typeof useWorkoutLogger>;
  duration: string | null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5 text-center">
      <p className="text-xl font-black tabular-nums text-text-primary">{value}</p>
      <p className="text-3xs font-bold uppercase tracking-wider text-text-muted">{label}</p>
    </div>
  );
}

/** Zakończenie: trzy liczby, nazwa podpowiedziana automatycznie, opcjonalnie ocena i notatka. Jedno stuknięcie zapisuje. */
export default function LiveFinishSheet({ open, onOpenChange, logger, duration }: Props) {
  const [showMore, setShowMore] = useState(false);
  const summary = summarize(logger.exercises);
  const suggestedName = autoWorkoutName(logger.exercises);
  const empty = summary.sets === 0;
  const unchecked = countUnchecked(logger.exercises);

  const save = () => {
    if (!logger.workoutName.trim()) logger.setWorkoutName(suggestedName);
    void logger.save();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Koniec treningu" side="bottom">
      <div className="trening-theme space-y-4 !bg-transparent px-1 pt-1">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Czas" value={duration ?? '—'} />
          <Stat label="Serie" value={String(summary.sets)} />
          <Stat label="Objętość" value={formatKg(summary.volumeKg)} />
        </div>

        <ControlInput
          aria-label="Nazwa treningu"
          value={logger.workoutName}
          onChange={(event) => logger.setWorkoutName(event.target.value)}
          placeholder={suggestedName}
          className="h-12 w-full rounded-2xl border border-border-custom bg-surface-2 px-4 text-base font-semibold text-text-primary placeholder:text-text-muted"
        />

        <div>
          <p className="mb-1.5 text-xs font-bold text-text-secondary">Jak ciężki był cały trening? RPE (1–10) *</p>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <Pressable
                key={n}
                aria-pressed={logger.sessionRpe === n}
                onClick={() => logger.setSessionRpe(n)}
                className={`h-10 rounded-xl border text-sm font-bold ${
                  logger.sessionRpe === n ? 'border-primary bg-primary/15 text-primary' : 'border-border-custom bg-surface-1 text-text-secondary'
                }`}
              >
                {n}
              </Pressable>
            ))}
          </div>
        </div>

        <Pressable onClick={() => setShowMore((v) => !v)} className="text-sm font-semibold text-primary">
          {showMore ? 'Mniej' : 'Notatka, data'}
        </Pressable>

        {showMore && (
          <div className="space-y-3">
            <ControlTextarea
              aria-label="Notatka"
              value={logger.notes}
              onChange={(event) => logger.setNotes(event.target.value)}
              placeholder="Jak poszło?"
              rows={3}
              className="w-full rounded-2xl border border-border-custom bg-surface-2 p-3 text-sm text-text-primary placeholder:text-text-muted"
            />
            <ManualTimePicker logger={logger} />
          </div>
        )}

        {unchecked > 0 && (
          <p className="rounded-2xl bg-warning/10 px-3 py-2 text-sm font-semibold text-warning">
            {unchecked} {unchecked === 1 ? 'seria ma wpisane wartości, ale bez ✓' : 'serie mają wpisane wartości, ale bez ✓'} — zapiszą się razem z treningiem.
          </p>
        )}
        {empty && <p className="text-center text-sm text-text-muted">Zalicz przynajmniej jedną serię, żeby zapisać trening.</p>}
        {!empty && logger.sessionRpe == null && <p className="text-center text-sm text-text-muted">Zaznacz RPE, żeby zapisać trening.</p>}
        <Button variant="primary" size="lg" disabled={empty || logger.sessionRpe == null || logger.saving} onClick={save} className="w-full !h-14 !rounded-2xl !text-base !font-black">
          {logger.saving ? 'Zapisuję…' : 'Zapisz trening'}
        </Button>
      </div>
    </Sheet>
  );
}
