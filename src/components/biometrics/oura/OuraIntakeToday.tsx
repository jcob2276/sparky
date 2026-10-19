import { Check, Coffee, Pill } from 'lucide-react';
import Button from '../../ui/Button';
import type { TodayStackItem } from '../../../lib/biometrics/ouraIntakeInsights';

const DAY_START_HOUR = 6;
const DAY_SPAN_HOURS = 18; // 06:00–24:00

function hourPercent(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const pos = ((h + (m || 0) / 60 - DAY_START_HOUR) / DAY_SPAN_HOURS) * 100;
  return Math.min(100, Math.max(0, pos));
}

function StripRow({ label, icon: Icon, times, tone }: {
  label: string;
  icon: typeof Coffee;
  times: string[];
  tone: 'bg-warning' | 'bg-primary';
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-24 shrink-0 items-center gap-1.5 text-xs text-text-secondary">
        <Icon size={14} strokeWidth={1.8} /> {label}
      </span>
      <div className="relative h-3 flex-1 rounded-full bg-surface-3" role="img"
        aria-label={times.length ? `${label}: ${times.join(', ')}` : `${label}: brak wpisów`}>
        {times.map((t, i) => (
          <span
            key={`${t}-${i}`}
            title={t}
            className={`absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full ${tone}`}
            style={{ left: `${hourPercent(t)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

interface TodayStripProps {
  caffeineTimes: string[];
  stack: TodayStackItem[];
  /** Id suplementów, dla których trwa zapis. */
  pendingIds: ReadonlySet<string>;
  error: string | null;
  onToggle: (item: TodayStackItem) => void;
}

function rowStatus(s: TodayStackItem): string {
  if (s.taken) return `Zażyty${s.takenAt ? ` o ${s.takenAt}` : ''}`;
  return s.plannedAt ? `Zaplanowany na ${s.plannedAt} · kliknij, by zaznaczyć` : 'Jeszcze nie zażyty · kliknij, by zaznaczyć';
}

export function TodayStrip({ caffeineTimes, stack, pendingIds, error, onToggle }: TodayStripProps) {
  const supplementTimes = stack.flatMap((s) => (s.takenAt ? [s.takenAt] : []));
  return (
    <div className="space-y-3 rounded-xl border border-border-custom bg-surface-2 p-5">
      <p className="text-sm text-text-secondary">Dziś</p>
      <StripRow label="Kawa" icon={Coffee} times={caffeineTimes} tone="bg-warning" />
      <StripRow label="Suple" icon={Pill} times={supplementTimes} tone="bg-primary" />
      <div className="flex gap-3 text-xs text-text-muted">
        <span className="w-24 shrink-0" />
        <div className="flex flex-1 justify-between">
          <span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
        </div>
      </div>
      {stack.length > 0 ? (
        <ul className="space-y-1">
          {stack.map((s) => (
            <li key={s.id}>
              <Button
                variant="ghost"
                role="checkbox"
                aria-checked={s.taken}
                aria-busy={pendingIds.has(s.id)}
                disabled={pendingIds.has(s.id)}
                onClick={() => onToggle(s)}
                haptic="selection"
                className="min-h-11 w-full justify-between gap-3 px-2 text-left"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                      s.taken ? 'border-primary bg-primary text-on-accent' : 'border-border-custom text-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className={s.taken ? 'text-text-primary' : 'text-text-secondary'}>{s.name}</span>
                </span>
                <span className="text-xs font-normal text-text-muted">{rowStatus(s)}</span>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-text-muted">Brak aktywnych suplementów na dziś.</p>
      )}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
