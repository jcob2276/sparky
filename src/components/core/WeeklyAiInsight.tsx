import { RefreshCw, Sparkles } from 'lucide-react';
import { useWeekAiInsight } from '../../lib/weekAiInsight';
import { useUserId } from '../../store/useStore';
import { Pressable } from '../ui/ControlPrimitives';
import Spinner from '../ui/Spinner';

/** AI reading of the last 7 days: the plan, the user's own ratings and opinions, and the Telegram journal. Runs only on request. */
export default function WeeklyAiInsight({ today }: { today: string }) {
  const userId = useUserId();
  const { result, generate, loading, error } = useWeekAiInsight(userId, today);
  const insight = result?.insight;

  return (
    <section className="space-y-3 rounded-3xl border border-border-custom/60 bg-surface/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-2xs font-semibold tracking-wide text-text-muted">
          <Sparkles size={12} className="text-primary" /> Analiza AI · 7 dni
        </p>
        {insight && !loading && (
          <Pressable
            type="button"
            onClick={generate}
            aria-label="Odśwież analizę"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:scale-95"
          >
            <RefreshCw size={14} aria-hidden="true" />
          </Pressable>
        )}
      </div>

      {!insight && !loading && (
        <>
          <p className="text-sm leading-snug text-text-secondary">
            AI przeczyta Twój plan, oceny i opinie dnia oraz dziennik z Telegrama i wskaże, co konkretnie zmienić.
          </p>
          <Pressable
            type="button"
            onClick={generate}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/15 px-3 text-sm font-semibold text-primary active:scale-95 ui-interactive"
          >
            <Sparkles size={16} aria-hidden="true" />
            Przeanalizuj mój tydzień
          </Pressable>
        </>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Spinner size="sm" /> AI czyta Twoje podsumowania i dziennik…
        </div>
      )}

      {error && !loading && <p role="alert" className="text-xs font-semibold text-warning">{error}</p>}

      {insight && (
        <div className="space-y-4">
          <p className="text-sm leading-snug text-text-primary">{insight.summary}</p>

          {insight.changes.length > 0 && (
            <div className="space-y-3">
              <p className="text-2xs font-semibold tracking-wide text-text-muted">Co zmienić</p>
              <ol className="space-y-3">
                {insight.changes.map((change, index) => (
                  <li key={change.title} className="space-y-0.5">
                    <p className="text-sm font-semibold leading-snug text-text-primary">{index + 1}. {change.title}</p>
                    <p className="text-xs leading-snug text-text-muted">{change.why}</p>
                    <p className="text-xs font-semibold leading-snug text-primary">Jutro: {change.how}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {insight.patterns.length > 0 && (
            <div className="space-y-2">
              <p className="text-2xs font-semibold tracking-wide text-text-muted">Powtarza się</p>
              <ul className="space-y-2">
                {insight.patterns.map((pattern) => (
                  <li key={pattern.theme}>
                    <p className="text-sm font-semibold leading-snug text-text-primary">{pattern.theme}</p>
                    <p className="text-xs italic leading-snug text-text-muted">{pattern.evidence}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-2xs font-medium text-text-muted">
            Na podstawie {result.basedOn.days} dni i {result.basedOn.journalEntries} wpisów z dziennika. To wskazówka, nie diagnoza.
          </p>
        </div>
      )}
    </section>
  );
}
