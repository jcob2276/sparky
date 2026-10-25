import { ArrowRight, GitCompareArrows } from 'lucide-react';
import { requestChronicle } from '../../lib/chronicle/chronicleIntent';
import { WEEK_HIGHLIGHTS, pickTiles } from '../../lib/chronicle/highlights';
import type { ChroniclePeriod } from '../../lib/chronicle/periods';
import type { ChronicleGoal, ChronicleSummaryData, ChronicleTile } from '../../lib/chronicle/summaryTypes';
import { Pressable } from '../ui/ControlPrimitives';
import { useDashboardContext } from './context/DashboardContext';
import { useChronicle } from './chronicle/useChronicle';

const TONE_CLASS: Record<ChronicleTile['tone'], string> = {
  good: 'text-success',
  bad: 'text-danger',
  neutral: 'text-text-muted',
};

function Metric({ tile, onOpen }: { tile: ChronicleTile; onOpen: () => void }) {
  return (
    <Pressable
      type="button"
      onClick={onOpen}
      className="rounded-2xl border border-border-custom/40 bg-surface/50 p-3 text-left active:scale-95 ui-interactive"
    >
      <p className="text-2xs font-semibold tracking-wide text-text-muted">{tile.label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-text-primary">
        {tile.value}
        {tile.hint && <span className="ml-1 text-2xs font-bold text-text-muted">{tile.hint}</span>}
      </p>
      <p className={`text-2xs font-bold tabular-nums ${TONE_CLASS[tile.tone]}`}>
        {tile.delta ? `${tile.delta} vs poprzedni` : 'brak porównania'}
      </p>
    </Pressable>
  );
}

/** Ten tydzień na tle poprzedniego w kilku liczbach i skróty do porównania dowolnych tygodni lub miesięcy w Kronice. */
export default function WeeklyComparePulse() {
  const dashboard = useDashboardContext();
  const konto = useChronicle('konto', 'week');
  const cialo = useChronicle('cialo', 'week');
  const bySummary: Record<ChronicleGoal, ChronicleSummaryData | null> = {
    duch: null, konto: konto.summary, cialo: cialo.summary,
  };
  const loading = konto.loading || cialo.loading;

  const open = (goal: ChronicleGoal, period: ChroniclePeriod) => {
    requestChronicle({ goal, period, offset: 0, compareOffset: 1 });
    dashboard.navigateTo('historia');
  };

  const metrics = WEEK_HIGHLIGHTS.flatMap(({ goal, labels }) =>
    pickTiles(bySummary[goal], labels).map((tile) => ({ goal, tile })),
  );
  if (!loading && metrics.length === 0) return null;

  return (
    <section className="space-y-3 rounded-3xl border border-border-custom/60 bg-surface/70 p-4">
      <p className="flex items-center gap-1.5 text-2xs font-semibold tracking-wide text-text-muted">
        <GitCompareArrows size={12} className="text-primary" /> Ten tydzień na tle poprzedniego
      </p>

      {loading ? (
        <p className="text-sm text-text-secondary">Liczę porównanie…</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {metrics.map(({ goal, tile }) => (
            <Metric key={`${goal}-${tile.label}`} tile={tile} onOpen={() => open(goal, 'week')} />
          ))}
        </div>
      )}
      <p className="text-2xs font-medium text-text-muted">Ten tydzień jeszcze trwa, a poprzedni jest pełny, więc zmiany w trakcie tygodnia wyglądają gorzej.</p>

      <div className="flex gap-2">
        <Pressable
          type="button"
          onClick={() => open('duch', 'week')}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-primary/40 bg-primary/15 px-3 text-xs font-semibold text-primary active:scale-95 ui-interactive"
        >
          Porównaj tygodnie <ArrowRight size={13} aria-hidden="true" />
        </Pressable>
        <Pressable
          type="button"
          onClick={() => open('duch', 'month')}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border-custom/60 bg-surface-solid/50 px-3 text-xs font-semibold text-text-primary active:scale-95 ui-interactive"
        >
          Porównaj miesiące <ArrowRight size={13} aria-hidden="true" />
        </Pressable>
      </div>
    </section>
  );
}
