import { RefreshCw, Sparkles } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

interface Props {
  insight: string | null;
  loading?: boolean;
  onRefresh?: () => void;
}

/** Coach load recommendation from analyze-training-load (cached + refreshable). */
export default function TrainingHubInsight({ insight, loading = false, onRefresh }: Props) {
  return (
    <aside className="trening-panel rounded-[var(--tren-radius-card)] px-3.5 py-3 space-y-2 border-primary/15">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <Sparkles size={13} />
          </div>
          <div className="min-w-0">
            <p className="text-2xs font-black uppercase tracking-wider text-primary">Insight</p>
            {loading && (
              <p className="text-3xs text-text-muted leading-none mt-0.5">aktualizacja…</p>
            )}
          </div>
        </div>
        {onRefresh && (
          <Pressable
            onClick={onRefresh}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-primary/85 hover:bg-primary/12 disabled:opacity-50 cursor-pointer"
            aria-label="Odśwież rekomendację obciążenia"
            title="Odśwież (analyze-training-load)"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </Pressable>
        )}
      </div>

      {insight ? (
        <p className="text-sm text-text-primary leading-snug">{insight}</p>
      ) : (
        <p className="text-xs text-text-secondary leading-snug">
          {loading
            ? 'Sparky analizuje obciążenie…'
            : 'Brak rekomendacji — odśwież, by pobrać z Sparky.'}
        </p>
      )}
    </aside>
  );
}
