import { FileDown } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import Button from '../../ui/Button';
import { useHaptics } from '../../../hooks/useHaptics';
import { PERIOD_LABELS, type ChroniclePeriod } from '../../../lib/chronicle/periods';
import { GOAL_LABELS, type ChronicleGoal } from '../../../lib/chronicle/summaryTypes';

const GOALS: ChronicleGoal[] = ['cialo', 'duch', 'konto'];
const PERIODS: ChroniclePeriod[] = ['week', 'month', 'sprint', 'year'];

interface Props {
  goal: ChronicleGoal;
  onGoal: (goal: ChronicleGoal) => void;
  period: ChroniclePeriod;
  onPeriod: (period: ChroniclePeriod) => void;
  onExport: () => void;
}

/** Cel (Ciało, Duch, Konto) z eksportem po prawej oraz okres w jednym rzędzie chipów. */
export default function ChronicleControls({ goal, onGoal, period, onPeriod, onExport }: Props) {
  const haptics = useHaptics();
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Cele kroniki">
          {GOALS.map((id) => {
            const active = id === goal;
            return (
              <Pressable
                key={id}
                role="tab"
                aria-selected={active}
                onClick={() => { haptics.selection(); onGoal(id); }}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold whitespace-nowrap ui-interactive active:scale-95 cursor-pointer ${
                  active ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border-custom/80 bg-surface/70 text-text-muted hover:text-text-primary'
                }`}
              >
                {GOAL_LABELS[id]}
              </Pressable>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          icon={<FileDown size={12} />}
          className="!h-7 !px-2.5 !text-2xs font-semibold tracking-wide text-primary border-primary/25 bg-primary/10 hover:bg-primary/20 rounded-full shrink-0"
        >
          Eksport
        </Button>
      </div>
      <div className="flex items-center gap-1.5" role="group" aria-label="Okres">
        {PERIODS.map((id) => {
          const active = id === period;
          return (
            <Pressable
              key={id}
              aria-pressed={active}
              onClick={() => { haptics.selection(); onPeriod(id); }}
              className={`rounded-full border px-2.5 py-1 text-2xs font-bold ui-interactive active:scale-95 cursor-pointer ${
                active ? 'border-border-strong bg-surface text-text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {PERIOD_LABELS[id]}
            </Pressable>
          );
        })}
      </div>
    </div>
  );
}
