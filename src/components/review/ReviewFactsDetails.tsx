import { Mic } from 'lucide-react';
import type { ReviewContext } from '../../lib/goal/reviewCycle.data';

const SECTION = 'space-y-3 pt-3 border-t border-border-custom/40 animate-fadeIn';

export function ExpensesDetail({ expenses }: { expenses: NonNullable<ReviewContext['expenses']> }) {
  const total = Math.max(1, expenses.total);
  return (
    <div className={SECTION}>
      {expenses.categories.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-2xs font-bold text-text-primary">Główne kategorie wydatków:</span>
          <div className="grid grid-cols-2 gap-1.5">
            {expenses.categories.map((c) => (
              <div key={c.category} className="rounded-lg bg-surface-2/50 p-2 text-2xs">
                <div className="flex justify-between font-semibold text-text-primary">
                  <span className="truncate">{c.category}</span>
                  <span>{c.total.toLocaleString('pl-PL')} zł</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-2xs text-text-muted">
                  <span>{c.count} trans.</span>
                  <span>{Math.round((c.total / total) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expenses.topExpenses.length > 0 && (
        <div className="space-y-1">
          <span className="text-2xs font-bold text-text-primary">Największe pojedyncze wydatki:</span>
          <div className="space-y-1">
            {expenses.topExpenses.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded bg-surface-2/40 px-2 py-1 text-2xs">
                <div className="truncate pr-2">
                  <span className="font-medium text-text-primary">{tx.title}</span>
                  {tx.date && <span className="ml-1.5 text-2xs text-text-muted">({tx.date})</span>}
                </div>
                <span className="shrink-0 font-semibold text-text-primary">{tx.amount.toLocaleString('pl-PL')} zł</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function VoiceDetail({ entries }: { entries: NonNullable<ReviewContext['voiceHighlights']> }) {
  return (
    <div className={SECTION}>
      <span className="flex items-center gap-1.5 text-2xs font-bold text-text-primary">
        <Mic size={12} className="text-primary" /> Ostatnie notatki ze strumienia:
      </span>
      <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
        {entries.map((entry) => (
          <div key={entry.id} className="space-y-1 rounded-lg bg-surface-2/40 p-2 text-2xs">
            <p className="whitespace-pre-line italic leading-relaxed text-text-primary">"{entry.content}"</p>
            {entry.createdAt && (
              <span className="block text-2xs text-text-muted">{entry.createdAt.slice(0, 16).replace('T', ' ')}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
