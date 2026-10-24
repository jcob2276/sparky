import { RefreshCw, Sparkles } from 'lucide-react';
import { usePeriodAiCompare, type ComparePeriod } from '../../../lib/chronicle/aiCompare';
import { getTodayWarsaw } from '../../../lib/date';
import { useUserId } from '../../../store/useStore';
import { Pressable } from '../../ui/ControlPrimitives';
import Spinner from '../../ui/Spinner';

function Section({ title, tone, items }: { title: string; tone: string; items: Array<{ title: string; evidence: string }> }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className={`text-2xs font-semibold tracking-wide ${tone}`}>{title}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.title}>
            <p className="text-sm font-semibold leading-snug text-text-primary">{item.title}</p>
            <p className="text-xs leading-snug text-text-muted">{item.evidence}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Props {
  a: ComparePeriod;
  b: ComparePeriod;
}

/** AI zestawia dwa wybrane okresy: co się poprawiło i pogorszyło, co zmienić, oraz różnice w dzienniku z Telegrama. Tylko na żądanie. */
export default function ChronicleAiCompare({ a, b }: Props) {
  const userId = useUserId();
  const { result, generate, loading, error } = usePeriodAiCompare(userId, a, b, getTodayWarsaw());
  const comparison = result?.comparison;

  return (
    <section className="space-y-3 rounded-3xl border border-border-custom/60 bg-surface/70 p-4" aria-label="Porównanie AI">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-2xs font-semibold tracking-wide text-text-muted">
          <Sparkles size={12} className="text-primary" /> Porównanie AI
        </p>
        {comparison && !loading && (
          <Pressable type="button" onClick={generate} aria-label="Odśwież porównanie" className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted active:scale-95">
            <RefreshCw size={14} aria-hidden="true" />
          </Pressable>
        )}
      </div>

      <p className="text-xs font-semibold text-text-secondary">{a.label} <span className="text-text-muted">vs</span> {b.label}</p>

      {!comparison && !loading && (
        <>
          <p className="text-sm leading-snug text-text-secondary">
            AI zestawi sen, jedzenie, trening, sprzedaż, oceny dni i to, co piszesz w dzienniku z Telegrama, i wskaże, co konkretnie zmienić.
          </p>
          <Pressable
            type="button"
            onClick={generate}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/15 px-3 text-sm font-semibold text-primary active:scale-95 ui-interactive"
          >
            <Sparkles size={16} aria-hidden="true" />
            Porównaj z AI
          </Pressable>
        </>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Spinner size="sm" /> AI czyta oba okresy i Twój dziennik…
        </div>
      )}

      {error && !loading && <p role="alert" className="text-xs font-semibold text-warning">{error}</p>}

      {comparison && (
        <div className="space-y-4">
          <p className="text-sm leading-snug text-text-primary">{comparison.summary}</p>
          <Section title="Poprawiło się" tone="text-success" items={comparison.improved} />
          <Section title="Pogorszyło się" tone="text-danger" items={comparison.worsened} />
          {comparison.changes.length > 0 && (
            <div className="space-y-2">
              <p className="text-2xs font-semibold tracking-wide text-text-muted">Co zmienić</p>
              <ol className="space-y-3">
                {comparison.changes.map((change, index) => (
                  <li key={change.title} className="space-y-0.5">
                    <p className="text-sm font-semibold leading-snug text-text-primary">{index + 1}. {change.title}</p>
                    <p className="text-xs leading-snug text-text-muted">{change.why}</p>
                    <p className="text-xs font-semibold leading-snug text-primary">Dalej: {change.how}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <Section title="W dzienniku" tone="text-text-muted" items={comparison.journal} />
          <p className="text-2xs font-medium text-text-muted">
            Na podstawie {result.basedOn.scoredDays[0]} i {result.basedOn.scoredDays[1]} ocenionych dni oraz {result.basedOn.journalEntries[0]} i {result.basedOn.journalEntries[1]} wpisów z dziennika. To wskazówka, nie diagnoza.
          </p>
        </div>
      )}
    </section>
  );
}
