import { Pressable } from '../../ui/ControlPrimitives';
import { formatClock } from './liveWorkoutUtils';

export interface LiveRestProps {
  remaining: number;
  finished: boolean;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
}

/** Timer w zaliczonej serii; korzysta ze wspólnego odliczania sesji. */
export default function LiveRestPill({ remaining, finished, onAdjust, onSkip }: LiveRestProps) {
  const step = 'min-h-11 rounded-full px-2 text-xs font-semibold tabular-nums';
  return (
    <div
      role="timer"
      aria-live="off"
      aria-label="Odpoczynek po serii"
      className="live-rest-row mt-2 flex flex-wrap items-center gap-1 rounded-md px-2 py-1"
    >
      <div className="min-w-0 flex-1 pl-1">
        <p className="text-2xs text-text-muted">{finished ? 'Koniec przerwy' : 'Przerwa'}</p>
        <p className="font-mono text-base font-semibold leading-none tabular-nums">{formatClock(Math.max(0, remaining))}</p>
      </div>
      {!finished && (
        <>
          <Pressable onClick={() => onAdjust(-15)} className={step} aria-label="Skróć przerwę o 15 sekund">−15</Pressable>
          <Pressable onClick={() => onAdjust(15)} className={step} aria-label="Wydłuż przerwę o 15 sekund">+15</Pressable>
        </>
      )}
      <Pressable onClick={onSkip} className={step}>
        {finished ? 'OK' : 'Pomiń'}
      </Pressable>
    </div>
  );
}
