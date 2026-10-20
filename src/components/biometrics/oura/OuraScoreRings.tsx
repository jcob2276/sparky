import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { RingModel } from '../../../lib/biometrics/ouraScoreBands';
import Button from '../../ui/Button';

interface OuraScoreRingsProps {
  rings: RingModel[];
  onOpenSleep: () => void;
  onOpenVitals: () => void;
}

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function TrendIcon({ trend }: { trend: RingModel['trend'] }) {
  if (trend === 'up') return <ArrowUpRight size={14} aria-hidden="true" />;
  if (trend === 'down') return <ArrowDownRight size={14} aria-hidden="true" />;
  return <Minus size={14} aria-hidden="true" />;
}

function Ring({ ring, onOpen }: { ring: RingModel; onOpen: () => void }) {
  const offset = CIRCUMFERENCE * (1 - ring.fraction);
  return (
    <Button variant="ghost" onClick={onOpen} aria-label={ring.ariaLabel}
      className="oura-ring-card !flex-col !gap-2 !rounded-2xl !bg-surface-1 !p-3 !font-normal !text-text-primary hover:!bg-surface-2 sm:!p-4">
      <span className="oura-ring" data-band={ring.band ?? ring.key} aria-hidden="true">
        <svg viewBox="0 0 120 120" className="oura-ring-svg" focusable="false">
          <circle className="oura-ring-track" cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="10" />
          {ring.value != null && (
            <circle className="oura-ring-arc" cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="10" strokeLinecap="round"
              transform="rotate(-90 60 60)" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
              style={{ '--oura-ring-c': CIRCUMFERENCE } as React.CSSProperties} />
          )}
        </svg>
        <span className="oura-ring-value">{ring.valueText}</span>
      </span>
      <span className="block text-center text-sm font-medium">{ring.label}</span>
      {ring.bandLabel !== ring.label && (
        <span className="oura-ring-band block text-center text-xs font-semibold" data-band={ring.band ?? ring.key}>{ring.bandLabel}</span>
      )}
      {ring.deltaText && (
        <span className="flex w-full items-center justify-center gap-1 text-center text-xs leading-4 text-text-muted">
          <TrendIcon trend={ring.trend} />{ring.deltaText}
        </span>
      )}
    </Button>
  );
}

export function OuraScoreRings({ rings, onOpenSleep, onOpenVitals }: OuraScoreRingsProps) {
  return (
    <div className="oura-rings grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${rings.length}, minmax(0, 1fr))` }}>
      {rings.map(ring => <Ring key={ring.key} ring={ring} onOpen={ring.key === 'sleep' ? onOpenSleep : onOpenVitals} />)}
    </div>
  );
}
