import React from 'react';
import type { HealthCoachWeeklyReview } from '@vanguard/domain';
import { Target, CheckCircle2, Dumbbell, Activity, HelpCircle } from 'lucide-react';
import { useHealthCoachWeeklyReview } from './useHealthCoachWeeklyReview';

interface Props {
  review: HealthCoachWeeklyReview | null | undefined;
  isLoading?: boolean;
  error?: Error | null;
}

export function HealthCoachWeeklyReviewView({ review, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border-custom bg-surface p-4 animate-pulse space-y-3">
        <div className="h-5 w-48 bg-white/10 rounded" />
        <div className="h-16 w-full bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="rounded-2xl border border-border-custom bg-surface p-4 text-xs text-text-muted">
        Brak dostępnego podsumowania celów dla tego tygodnia.
      </div>
    );
  }

  const { adherence, goalProgress, nextWeekProposal } = review;

  return (
    <div className="rounded-2xl border border-border-custom bg-surface p-4 space-y-4">
      {/* Nagłówek tygodnia */}
      <div className="flex items-center justify-between border-b border-border-custom pb-3">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Tygodniowy przegląd treningu i celów
          </h3>
        </div>
        <span className="text-2xs font-mono text-text-secondary">
          {review.weekStart} – {review.weekEnd}
        </span>
      </div>

      {/* Realizacja założeń (Adherence) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl border border-border-custom bg-surface-subtle p-2.5">
          <div className="text-3xs text-text-muted uppercase">Sesje wykonane</div>
          <div className="text-base font-bold font-mono text-text-primary mt-0.5">
            {adherence.completedSessionsCount} / {adherence.plannedSessionsCount}
          </div>
          <div className="text-3xs text-text-secondary mt-0.5">
            {adherence.adherenceRate != null ? `${Math.round(adherence.adherenceRate * 100)}% planu` : 'Brak planu'}
          </div>
        </div>

        <div className="rounded-xl border border-border-custom bg-surface-subtle p-2.5">
          <div className="text-3xs text-text-muted uppercase">Bieganie (Garmin)</div>
          <div className="text-base font-bold font-mono text-info mt-0.5">
            {adherence.cardioKm} km
          </div>
          <div className="text-3xs text-text-secondary mt-0.5">zweryfikowany dystans</div>
        </div>

        <div className="rounded-xl border border-border-custom bg-surface-subtle p-2.5">
          <div className="text-3xs text-text-muted uppercase">Siła (Serie)</div>
          <div className="text-base font-bold font-mono text-warning mt-0.5">
            {adherence.strengthSets}
          </div>
          <div className="text-3xs text-text-secondary mt-0.5">odnotowanych serii</div>
        </div>

        <div className="rounded-xl border border-border-custom bg-surface-subtle p-2.5">
          <div className="text-3xs text-text-muted uppercase">Nieodnotowane</div>
          <div className="text-base font-bold font-mono text-text-secondary mt-0.5">
            {adherence.unrecordedSessionsCount}
          </div>
          <div className="text-3xs text-text-secondary mt-0.5">brak wpisu ≠ opuszczenie</div>
        </div>
      </div>

      {adherence.note && (
        <p className="text-2xs text-text-secondary leading-relaxed bg-white/5 p-2.5 rounded-xl">
          {adherence.note}
        </p>
      )}

      {/* Postęp celów i standardów */}
      {goalProgress.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Target size={14} className="text-primary" /> Postęp celów ze standardami
          </h4>
          <div className="space-y-1.5">
            {goalProgress.map((g) => (
              <div
                key={g.kpiId}
                className="flex items-center justify-between p-2 rounded-xl bg-surface-subtle border border-border-custom text-2xs"
              >
                <div className="space-y-0.5">
                  <div className="font-medium text-text-primary">{g.name}</div>
                  <div className="text-3xs text-text-muted">Standard: {g.standard}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-text-primary">
                    {g.currentValue != null ? `${g.currentValue} ${g.unit}` : 'Brak świeżego pomiaru'}
                  </div>
                  <div className="text-3xs flex items-center justify-end gap-1">
                    {g.status === 'progressing' && (
                      <span className="text-success flex items-center gap-0.5">
                        <CheckCircle2 size={10} /> Progres
                      </span>
                    )}
                    {g.status === 'stable' && (
                      <span className="text-text-secondary flex items-center gap-0.5">
                        Stabilnie
                      </span>
                    )}
                    {g.status === 'unassessed' && (
                      <span className="text-text-muted flex items-center gap-0.5">
                        <HelpCircle size={10} /> Do oceny
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Propozycja na kolejny tydzień */}
      {nextWeekProposal && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Dumbbell size={14} className="text-primary" />
              Rekomendacja na kolejny tydzień
            </span>
            <span className="text-2xs font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              {nextWeekProposal.action === 'keep' && 'Utrzymanie'}
              {nextWeekProposal.action === 'progress' && 'Progresja'}
              {nextWeekProposal.action === 'deload' && 'Deload'}
              {nextWeekProposal.action === 'adjust' && 'Korekta'}
            </span>
          </div>
          <p className="text-2xs text-text-secondary leading-relaxed">
            {nextWeekProposal.rationale}
          </p>
          {nextWeekProposal.changesSummary.length > 0 && (
            <ul className="list-disc list-inside text-3xs text-text-muted space-y-0.5">
              {nextWeekProposal.changesSummary.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function HealthCoachWeeklyReviewContainer({
  userId,
  weekStart,
  weekEnd,
}: {
  userId: string | undefined;
  weekStart: string;
  weekEnd: string;
}) {
  const { data: review, isLoading, error } = useHealthCoachWeeklyReview(userId, weekStart, weekEnd);
  return <HealthCoachWeeklyReviewView review={review} isLoading={isLoading} error={error} />;
}
