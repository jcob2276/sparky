import { Card } from '../ui/Card';
import { Pressable } from '../ui/ControlPrimitives';
import type { DailyContextKey } from '../../lib/behavior/dailyContextApi';
import { useDailyContext } from './hooks/useDailyContext';

const ALCOHOL_OPTIONS = [
  { value: 0, label: 'Bez' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3+' },
] as const;
const STRESS_OPTIONS = [1, 2, 3, 4, 5] as const;

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <Pressable
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 min-w-9 rounded-lg px-3 text-xs font-semibold ui-interactive ${
        active ? 'bg-primary text-white' : 'bg-surface-3 text-text-secondary'
      }`}
    >
      {label}
    </Pressable>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-text-secondary">{title}</span>
      <div className="flex flex-wrap justify-end gap-1.5">{children}</div>
    </div>
  );
}

/**
 * Szybki log tego, czego nie da się zmierzyć czujnikiem, a co tłumaczy HRV i sen.
 * Jawne "Bez" zapisuje 0, żeby dzień bez alkoholu różnił się od niezalogowanego.
 */
export default function DailyContextLog() {
  const { days, today, valueFor, setValue, loading } = useDailyContext();

  const toggle = (date: string, key: DailyContextKey, current: number | null, next: number) =>
    setValue({ date, key, value: current === next ? null : next });

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Uzupełnij dane</h2>
        <p className="text-sm text-text-muted mt-0.5">
          Alkohol, choroba, podróż i stres tłumaczą wahania HRV i snu. Bez tych wpisów analiza ich nie widzi.
        </p>
      </div>
      {days.map((date) => {
        const alcohol = valueFor(date, 'alcohol');
        const sick = valueFor(date, 'sick');
        const travel = valueFor(date, 'travel');
        const stress = valueFor(date, 'stress');
        return (
          <Card key={date} variant="surface" padding="1rem" className="space-y-3" aria-busy={loading}>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              {date === today ? 'Dziś' : 'Wczoraj'} · {date}
            </p>
            <Row title="Alkohol (porcje)">
              {ALCOHOL_OPTIONS.map((o) => (
                <Chip key={o.value} label={o.label} active={alcohol === o.value}
                  onClick={() => toggle(date, 'alcohol', alcohol, o.value)} />
              ))}
            </Row>
            <Row title="Chorowałem">
              <Chip label="Tak" active={sick === 1} onClick={() => toggle(date, 'sick', sick, 1)} />
            </Row>
            <Row title="Podróż">
              <Chip label="Tak" active={travel === 1} onClick={() => toggle(date, 'travel', travel, 1)} />
            </Row>
            <Row title="Stres (1–5)">
              {STRESS_OPTIONS.map((n) => (
                <Chip key={n} label={String(n)} active={stress === n}
                  onClick={() => toggle(date, 'stress', stress, n)} />
              ))}
            </Row>
          </Card>
        );
      })}
    </section>
  );
}
