import { useState } from 'react';
import Button from '../ui/Button';
import { ControlTextarea, Pressable } from '../ui/ControlPrimitives';
import type { DueReview } from '../../lib/goal/reviewCycle';
import { PILLARS, averageScore, type PillarGoals, type PillarScores, type ReviewAnswers, type ReviewContext } from '../../lib/goal/reviewCycle.data';

const COPY = {
  week: { title: 'Zamknięcie tygodnia', horizon: 'na następny tydzień' },
  month: { title: 'Zamknięcie miesiąca', horizon: 'na następne 4 tygodnie' },
  sprint: { title: 'Zamknięcie sprintu', horizon: 'na następne 12 tygodni' },
} as const;

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function scoreTone(value: number) {
  if (value <= 3) return 'bg-danger text-on-accent border-danger';
  if (value <= 6) return 'bg-warning text-scrim border-warning';
  return 'bg-success text-on-accent border-success';
}

export default function ReviewForm({
  due,
  context,
  facts,
  gaps,
  saving,
  remaining,
  onSubmit,
}: {
  due: DueReview;
  context: ReviewContext | undefined;
  facts: string[];
  gaps: string[];
  saving: boolean;
  /** Ile przeglądów jeszcze czeka po tym. */
  remaining: number;
  onSubmit: (answers: ReviewAnswers) => void;
}) {
  const copy = COPY[due.kind];
  const [scores, setScores] = useState<Partial<PillarScores>>({});
  const [goals, setGoals] = useState<Partial<PillarGoals>>({});
  const [note, setNote] = useState('');

  const complete = PILLARS.every(({ key }) => scores[key] !== undefined && (goals[key] ?? '').trim().length > 0);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-2xs font-semibold text-warning">
          {copy.title}
          {remaining > 0 ? ` · jeszcze ${remaining} po tym` : ''}
        </p>
        <h2 className="text-lg font-bold text-text-primary">{due.label}</h2>
        <p className="text-xs text-text-secondary">Aplikacja czeka, aż to zamkniesz. Trzy oceny i jeden cel na filar.</p>
      </header>

      {(facts.length > 0 || gaps.length > 0) && (
        <section className="space-y-1 rounded-lg border border-border-custom bg-surface/50 px-3 py-2.5" aria-label="Liczby okresu">
          {facts.map((line) => (
            <p key={line} className="text-xs text-text-secondary">{line}</p>
          ))}
          {gaps.length > 0 && <p className="pt-1 text-xs font-semibold text-warning">Luki w danych: {gaps.join('; ')}</p>}
        </section>
      )}

      {PILLARS.map(({ key, label }) => {
        const previous = context?.previousGoals?.[key];
        const average = context ? averageScore(context.weekScores, key) : null;
        return (
          <section key={key} className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-bold text-text-primary">{label}</h3>
              {average !== null && <span className="text-2xs text-text-muted">średnio w tygodniach: {average}</span>}
            </div>
            {previous && <p className="text-xs text-text-muted">Cel, który miałeś: {previous}</p>}
            <div role="group" aria-label={`Stan: ${label}`} className="grid grid-cols-10 gap-1">
              {SCORES.map((value) => {
                const active = scores[key] === value;
                return (
                  <Pressable
                    key={value}
                    type="button"
                    aria-label={`${label} ${value}`}
                    aria-pressed={active}
                    onClick={() => setScores((prev) => ({ ...prev, [key]: value }))}
                    className={`min-h-10 rounded-md border text-xs font-semibold ui-interactive ${
                      active ? scoreTone(value) : 'border-border-custom bg-surface text-text-muted'
                    }`}
                  >
                    {value}
                  </Pressable>
                );
              })}
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-text-secondary">{label}: jedna rzecz {copy.horizon}</span>
              <ControlTextarea
                value={goals[key] ?? ''}
                onChange={(event) => setGoals((prev) => ({ ...prev, [key]: event.target.value }))}
                rows={2}
                className="w-full resize-y rounded-lg border border-border-custom bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary/50 focus:outline-none"
              />
            </label>
          </section>
        );
      })}

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-text-secondary">Jedno zdanie o tym okresie (opcjonalnie)</span>
        <ControlTextarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className="w-full resize-y rounded-lg border border-border-custom bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary/50 focus:outline-none"
        />
      </label>

      <Button
        variant="primary"
        className="w-full"
        disabled={!complete}
        loading={saving}
        onClick={() => onSubmit({ scores: scores as PillarScores, goals: goals as PillarGoals, note })}
      >
        {saving ? 'Zapisuję…' : 'Zamknij i ustaw cele'}
      </Button>
      {!complete && <p className="text-center text-2xs text-text-muted">Brakuje ocen lub celów, żeby zamknąć.</p>}
    </div>
  );
}
