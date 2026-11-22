import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Mic } from 'lucide-react';
import Button from '../ui/Button';
import type { ReviewContext } from '../../lib/goal/reviewCycle.data';
import { ExpensesDetail, VoiceDetail } from './ReviewFactsDetails';
import ReviewDayTasks from './ReviewDayTasks';
import ReviewSignals from './ReviewSignals';
import ReviewWeekStrip from './ReviewWeekStrip';

type Section = 'numbers' | 'expenses' | 'voice';

function Toggle({ open, onClick, children }: { open: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      aria-expanded={open}
      icon={open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      iconPosition="right"
      className="text-2xs"
    >
      {children}
    </Button>
  );
}

const hasDayData = (days: ReviewContext['days']) =>
  Boolean(days?.some((d) => d.score != null || d.sleepHours != null || d.tasksTotal > 0));

/** Tydzień w liczbach: najpierw obraz (7 dni, sygnały), tekstowe liczby i szczegóły dopiero na żądanie. */
export default function ReviewFactsPanel({
  facts,
  gaps,
  context,
}: {
  facts: string[];
  gaps: string[];
  context: ReviewContext | undefined;
}) {
  const [open, setOpen] = useState<Section | null>(null);
  const toggle = (section: Section) => setOpen((prev) => (prev === section ? null : section));

  const days = context?.days;
  const visual = hasDayData(days);
  const expenses = context?.expenses;
  const voice = context?.voiceHighlights;
  const showNumbersInline = !visual && facts.length > 0;

  return (
    <section className="space-y-3 rounded-xl border border-border-custom bg-surface/60 p-4 shadow-sm" aria-label="Liczby okresu">
      <h3 className="text-xs font-bold text-text-muted">Tydzień w liczbach</h3>

      {visual && days && <ReviewWeekStrip days={days} />}
      {days && context?.tasks && <ReviewDayTasks days={days} tasks={context.tasks} />}
      {context && <ReviewSignals context={context} />}

      {!visual && facts.length === 0 && (
        <p className="text-xs font-medium text-text-secondary">
          Nie ma jeszcze liczb za ten okres. Oceń go z pamięci i ustaw cele.
        </p>
      )}
      {(showNumbersInline || open === 'numbers') && (
        <div className="space-y-1">
          {facts.map((line) => (
            <p key={line} className="text-xs text-text-secondary">
              {line}
            </p>
          ))}
        </div>
      )}
      {gaps.length > 0 && (
        <p className="flex items-center gap-1.5 text-2xs font-semibold text-warning">
          <AlertCircle size={13} className="shrink-0" />
          Luki w danych: {gaps.join('; ')}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border-custom/50 pt-2">
        {visual && facts.length > 0 && (
          <Toggle open={open === 'numbers'} onClick={() => toggle('numbers')}>
            Wszystkie liczby
          </Toggle>
        )}
        {expenses && expenses.categories.length > 0 && (
          <Toggle open={open === 'expenses'} onClick={() => toggle('expenses')}>
            Wydatki {expenses.total.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} zł
          </Toggle>
        )}
        {voice && voice.length > 0 && (
          <Toggle open={open === 'voice'} onClick={() => toggle('voice')}>
            <Mic size={12} className="text-primary" /> Notatki ({voice.length})
          </Toggle>
        )}
      </div>

      {open === 'expenses' && expenses && <ExpensesDetail expenses={expenses} />}
      {open === 'voice' && voice && <VoiceDetail entries={voice} />}
    </section>
  );
}
