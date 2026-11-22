import { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import type { ReviewContext } from '../../lib/goal/reviewCycle.data';
import { useWeekRecap } from '../../lib/goal/useWeekRecap';

/**
 * Lustro tygodnia: analiza z całych danych (sen, telefon, żywienie, trening, poranne cele, oceny i notatki dnia, głosówki).
 * Liczy się sama przy otwarciu, więc nigdy nie jest pustym miejscem.
 */
export default function ReviewAiSection({
  userId,
  weekStart,
  contextReady,
  contextRecap,
}: {
  userId: string;
  weekStart: string;
  contextReady: boolean;
  contextRecap: ReviewContext['aiRecap'] | undefined;
}) {
  const { recap, generate, loading, error } = useWeekRecap(userId, weekStart, contextRecap, contextReady);
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm" aria-label="Lustro tygodnia">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <Sparkles size={14} /> Lustro tygodnia
        </h3>
        {recap && !loading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={generate}
            aria-label="Przelicz analizę tygodnia"
            icon={<RefreshCw size={13} />}
          />
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-2 text-xs text-text-secondary">
          <Spinner size="sm" /> Czytam Twój tydzień: sen, zadania, notatki dnia i głosówki…
        </div>
      )}

      {error && !loading && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-warning">{error}</p>
          <Button variant="tonal" size="sm" onClick={generate}>
            Spróbuj jeszcze raz
          </Button>
        </div>
      )}

      {recap && !loading && (
        <div className="space-y-3 text-xs">
          {recap.narrative && (
            <div className="space-y-1">
              <p className={`whitespace-pre-line leading-relaxed text-text-primary ${expanded ? '' : 'line-clamp-4'}`}>
                {recap.narrative}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} className="px-0 text-2xs">
                {expanded ? 'Zwiń' : 'Czytaj całość'}
              </Button>
            </div>
          )}

          {recap.longterm_motif && (
            <div className="rounded-lg border border-primary/20 bg-surface/70 p-2.5">
              <span className="mb-0.5 block text-2xs font-bold text-primary">
                Powracający motyw
              </span>
              <p className="text-2xs leading-snug text-text-secondary">{recap.longterm_motif}</p>
            </div>
          )}

          {recap.question && (
            <div className="space-y-0.5 rounded-lg border-l-2 border-primary bg-surface/80 p-2.5">
              <span className="block text-2xs font-bold text-text-muted">
                Pytanie na dziś
              </span>
              <p className="text-xs font-semibold italic leading-snug text-text-primary">"{recap.question}"</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
