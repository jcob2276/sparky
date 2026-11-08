import { useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import Button from '../ui/Button';
import { ControlTextarea } from '../ui/ControlPrimitives';
import type { QuickWeeklyReviewAnswers } from '../../lib/goal/goalSpine';

const QUESTIONS: ReadonlyArray<{ key: keyof QuickWeeklyReviewAnswers; label: string; placeholder: string }> = [
  { key: 'wentWell', label: 'Co poszło dobrze?', placeholder: 'Jedno zdanie wystarczy' },
  { key: 'didNotWork', label: 'Co nie działało?', placeholder: 'Jedno zdanie wystarczy' },
  { key: 'oneChange', label: 'Jedna zmiana na następny tydzień', placeholder: 'Co zrobisz inaczej?' },
];

const EMPTY: QuickWeeklyReviewAnswers = { wentWell: '', didNotWork: '', oneChange: '' };

export default function WeekHubQuickReview({
  weekLabel,
  saving,
  onSave,
  onStartFullReview,
}: {
  weekLabel: string;
  saving: boolean;
  onSave: (answers: QuickWeeklyReviewAnswers) => void;
  onStartFullReview?: () => void;
}) {
  const [answers, setAnswers] = useState<QuickWeeklyReviewAnswers>(EMPTY);
  const hasAnswer = Object.values(answers).some((value) => value.trim().length > 0);

  return (
    <section aria-label="Przegląd tygodnia w trzech pytaniach" className="space-y-3 rounded-lg border border-primary/25 bg-primary/[0.04] p-4">
      <header>
        <p className="flex items-center gap-1.5 text-2xs font-semibold text-primary">
          <CalendarCheck size={12} /> Przegląd tygodnia · {weekLabel}
        </p>
        <p className="mt-1 text-xs text-text-secondary">Trzy krótkie pytania. Możesz odpowiedzieć na jedno, byle swoimi słowami.</p>
      </header>
      {QUESTIONS.map((question) => (
        <label key={question.key} className="block">
          <span className="mb-1 block text-xs font-semibold text-text-primary">{question.label}</span>
          <ControlTextarea
            rows={2}
            value={answers[question.key]}
            placeholder={question.placeholder}
            onChange={(event) => setAnswers((current) => ({ ...current, [question.key]: event.target.value }))}
            className="w-full resize-none rounded-md border border-border-custom/60 px-3 py-2 text-sm"
          />
        </label>
      ))}
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="tonal" size="sm" disabled={!hasAnswer || saving} onClick={() => onSave(answers)}>
          Zapisz przegląd
        </Button>
        {onStartFullReview && (
          <Button type="button" variant="ghost" size="sm" onClick={onStartFullReview} className="text-xs font-semibold text-text-muted">
            Pełny przegląd i plan →
          </Button>
        )}
      </div>
    </section>
  );
}
