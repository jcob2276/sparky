import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import { useHaptics } from '../../../hooks/useHaptics';

interface StepperProps {
  label: string;
  what: string;
  canGoNewer: boolean;
  onOlder: () => void;
  onNewer: () => void;
}

function Stepper({ label, what, canGoNewer, onOlder, onNewer }: StepperProps) {
  const haptics = useHaptics();
  const step = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted active:scale-90 ui-interactive disabled:opacity-30';
  return (
    <div className="flex items-center" role="group" aria-label={what}>
      <Pressable type="button" haptic="none" aria-label={`${what}: wcześniejszy`} className={step} onClick={() => { haptics.selection(); onOlder(); }}>
        <ChevronLeft size={18} aria-hidden="true" />
      </Pressable>
      <span className="min-w-24 text-center text-sm font-semibold tabular-nums text-text-primary">{label}</span>
      <Pressable type="button" haptic="none" aria-label={`${what}: późniejszy`} disabled={!canGoNewer} className={step} onClick={() => { haptics.selection(); onNewer(); }}>
        <ChevronRight size={18} aria-hidden="true" />
      </Pressable>
    </div>
  );
}

interface Props {
  label: string;
  compareLabel: string;
  isCurrent: boolean;
  canCompareNewer: boolean;
  onShift: (delta: number) => void;
  onShiftCompare: (delta: number) => void;
  onReset: () => void;
}

/** Wybór okresu (tydzień/miesiąc/rok) i drugiego okresu, z którym go zestawiamy. */
export default function ChroniclePeriodPicker({ label, compareLabel, isCurrent, canCompareNewer, onShift, onShiftCompare, onReset }: Props) {
  return (
    <div className="space-y-0.5 rounded-2xl border border-border-custom/40 bg-surface/50 px-2 py-1">
      <div className="flex items-center justify-between gap-2">
        <Stepper label={label} what="Okres" canGoNewer={!isCurrent} onOlder={() => onShift(1)} onNewer={() => onShift(-1)} />
        {!isCurrent && (
          <Pressable type="button" onClick={onReset} className="min-h-11 rounded-full px-3 text-xs font-semibold text-primary active:scale-95">
            Bieżący
          </Pressable>
        )}
      </div>
      <div className="flex items-center gap-1 border-t border-border-custom/30">
        <span className="pl-2 text-2xs font-semibold tracking-wide text-text-muted">Porównaj z</span>
        <Stepper label={compareLabel} what="Okres porównania" canGoNewer={canCompareNewer} onOlder={() => onShiftCompare(1)} onNewer={() => onShiftCompare(-1)} />
      </div>
    </div>
  );
}
