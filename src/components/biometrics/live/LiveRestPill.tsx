import { Pressable } from '../../ui/ControlPrimitives';
import { formatClock } from './liveWorkoutUtils';

interface Props {
  remaining: number;
  finished: boolean;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
}

/** Pływający timer przerwy: sam startuje po serii, można skrócić/wydłużyć lub pominąć. */
export default function LiveRestPill({ remaining, finished, onAdjust, onSkip }: Props) {
  const step = 'h-10 rounded-full border border-border-custom bg-surface-1 px-3 text-xs font-bold text-text-secondary active:bg-primary/10';
  return (
    <div
      role="timer"
      aria-live="off"
      className={`flex items-center gap-2 rounded-full border px-3 py-2 shadow-lg backdrop-blur ${
        finished ? 'border-primary bg-primary text-on-accent' : 'border-border-custom bg-surface-solid text-text-primary'
      }`}
    >
      <div className="min-w-0 flex-1 pl-1">
        <p className={`text-2xs font-bold tracking-normal ${finished ? 'text-on-accent' : 'text-text-muted'}`}>{finished ? 'Koniec przerwy' : 'Przerwa'}</p>
        <p className="text-xl font-semibold leading-none tabular-nums">{finished ? 'Do dzieła' : formatClock(remaining)}</p>
      </div>
      {!finished && (
        <>
          <Pressable onClick={() => onAdjust(-15)} className={step} aria-label="Skróć przerwę o 15 sekund">−15</Pressable>
          <Pressable onClick={() => onAdjust(15)} className={step} aria-label="Wydłuż przerwę o 15 sekund">+15</Pressable>
        </>
      )}
      <Pressable onClick={onSkip} className={`h-10 rounded-full px-3 text-xs font-bold ${finished ? 'bg-on-accent/15' : 'text-primary'}`}>
        {finished ? 'OK' : 'Pomiń'}
      </Pressable>
    </div>
  );
}
