import { Pressable } from '../../ui/ControlPrimitives';
import type { PlateCalculationResult } from '../../../lib/health/workoutPlateCalculator';
import { getPlateColorClass, getPlateHeightClass, SLEEVE_BAY_CLASS } from './plateStyles';

interface BarbellSleeveProps {
  result: PlateCalculationResult;
  /** When set, tapping a plate removes that denomination × 2 from total. */
  onRemovePlate?: (plateKg: number) => void;
  className?: string;
}

function PlateDisc({ plate, onRemove }: { plate: number; onRemove?: (plateKg: number) => void }) {
  const bodyClass = [
    'group relative flex shrink-0 flex-col items-center justify-center',
    'rounded-[3px] border font-bold leading-none',
    'shadow-[2px_0_6px_rgb(0_0_0_/0.35),inset_1px_0_0_rgb(255_255_255_/0.22),inset_-1px_0_0_rgb(0_0_0_/0.25)]',
    'transition-transform duration-[var(--motion-fast,120ms)] active:scale-95',
    getPlateHeightClass(plate),
    getPlateColorClass(plate),
  ].join(' ');

  const label = (
    <>
      <span aria-hidden className="pointer-events-none absolute inset-y-1 left-0 w-px bg-white/35" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-[32%] left-1/2 w-[55%] -translate-x-1/2 rounded-[1px] bg-background/30"
      />
      <span className="relative z-[1] text-3xs tracking-tight opacity-95 drop-shadow-sm">
        {plate}
      </span>
    </>
  );

  if (!onRemove) {
    return (
      <div className={bodyClass} title={`${plate} kg`}>
        {label}
      </div>
    );
  }

  return (
    <Pressable
      aria-label={`Zdejmij talerz ${plate} kg`}
      onClick={() => onRemove(plate)}
      className={`${bodyClass} hover:brightness-110`}
      title={`${plate} kg — kliknij, aby zdjąć`}
    >
      {label}
    </Pressable>
  );
}

/** One sleeve of an olympic bar: collar + stacked plates as real discs on a shaft. */
export default function BarbellSleeve({ result, onRemovePlate, className = '' }: BarbellSleeveProps) {
  const plates = result.plates.flatMap((p) =>
    Array.from({ length: p.count }, (_, i) => ({ plate: p.plate, key: `${p.plate}-${i}` })),
  );

  return (
    <div
      className={`${SLEEVE_BAY_CLASS} ${className}`}
      aria-label={`Talerze: ${result.weightPerSide} kg na stronę`}
    >
      {/* shaft */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-1/2 h-[7px] -translate-y-1/2 bg-gradient-to-b from-surface-raised via-surface-3 to-surface-raised shadow-[0_1px_0_rgb(255_255_255_/0.08)]"
      />
      {/* seledynowy tip glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 h-8 w-16 -translate-y-1/2 bg-gradient-to-l from-primary/15 to-transparent"
      />

      {/* collar */}
      <div
        aria-hidden
        className="relative z-[1] mr-0.5 flex h-14 w-2 shrink-0 items-center justify-center rounded-[2px] border border-border-custom bg-gradient-to-b from-surface-raised to-surface-2 shadow-sm"
      >
        <div className="h-full w-px bg-white/15" />
      </div>

      <div className="relative z-[1] flex items-center gap-px pl-0.5">
        {plates.length === 0 ? (
          <span className="pl-2 text-3xs font-medium text-text-muted">Sam gryf</span>
        ) : (
          plates.map(({ plate, key }) => (
            <PlateDisc key={key} plate={plate} onRemove={onRemovePlate} />
          ))
        )}
      </div>

      {/* sleeve end cap */}
      <div
        aria-hidden
        className="relative z-[1] ml-auto h-2.5 w-3 shrink-0 rounded-r-sm border border-border-custom bg-surface-raised"
      />
    </div>
  );
}
