import type { HealthCoachWeeklyReview } from '@vanguard/domain';
import { Target, Dumbbell, CheckCircle2 } from 'lucide-react';
import { useHealthCoachWeeklyReview } from './useHealthCoachWeeklyReview';
import { useWeeklyBodyPulse } from '../../../lib/biometricsApi';

interface TrainingActivity {
  gymCount: number;
  runCount: number;
  runKm: number;
  saunaCount: number;
  saunaMinutes: number;
}

interface Props {
  review: HealthCoachWeeklyReview | null | undefined;
  activity?: TrainingActivity | null;
  isLoading?: boolean;
  error?: Error | null;
}

const ACTION_LABEL: Record<string, string> = { progress: 'Dołóż obciążenia', deload: 'Lżejszy tydzień', adjust: 'Zmień plan' };

function ActivityChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-border-custom/40 bg-surface/50 p-3">
      <p className="text-3xs font-black uppercase tracking-widest text-text-muted">{label}</p>
      <p className="mt-1 truncate text-base font-black text-text-primary">{value}</p>
    </div>
  );
}

function activityChips(a: TrainingActivity | null | undefined) {
  if (!a) return [];
  const chips: Array<{ label: string; value: string }> = [];
  if (a.runCount > 0) chips.push({ label: 'Bieganie', value: a.runKm > 0 ? `${a.runKm} km · ${a.runCount}×` : `${a.runCount}×` });
  if (a.gymCount > 0) chips.push({ label: 'Siłownia', value: `${a.gymCount}×` });
  if (a.saunaCount > 0) chips.push({ label: 'Sauna', value: a.saunaMinutes > 0 ? `${a.saunaCount}× · ${a.saunaMinutes} min` : `${a.saunaCount}×` });
  return chips;
}

export function HealthCoachWeeklyReviewView({ review, activity, isLoading, error }: Props) {
  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-3xl border border-border-custom/60 bg-surface/70" />;
  }

  const chips = activityChips(activity);
  const adherence = review?.adherence;
  const hasPlan = (adherence?.plannedSessionsCount ?? 0) > 0;
  const measured = (review?.goalProgress ?? []).filter((g) => g.currentValue != null);
  const waiting = (review?.goalProgress ?? []).filter((g) => g.currentValue == null);
  const proposal = review?.nextWeekProposal;
  const showProposal = proposal != null && proposal.action !== 'keep';

  return (
    <section className="space-y-3 rounded-3xl border border-border-custom/60 bg-surface/70 p-4">
      <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-widest text-text-muted">
        <Dumbbell size={12} className="text-primary" /> Trening · 7 dni
      </p>

      {chips.length > 0 ? (
        <div className="flex gap-2">{chips.map((c) => <ActivityChip key={c.label} {...c} />)}</div>
      ) : (
        <p className="text-sm text-text-secondary">Brak zapisanych treningów w ostatnich 7 dniach.</p>
      )}

      {hasPlan && adherence && (
        <p className="text-xs font-semibold text-text-secondary">
          Plan: {adherence.completedSessionsCount ?? 0} z {adherence.plannedSessionsCount} sesji
          {(adherence.unrecordedSessionsCount ?? 0) > 0 && ` · ${adherence.unrecordedSessionsCount} bez wpisu (to nie znaczy, że opuszczone)`}
        </p>
      )}

      {measured.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-3xs font-black uppercase tracking-widest text-text-muted">
            <Target size={11} className="text-primary" /> Cele
          </p>
          {measured.map((g) => (
            <div key={g.kpiId} className="flex items-center justify-between gap-2 rounded-2xl border border-border-custom/40 bg-surface/50 px-3 py-2 text-xs">
              <span className="min-w-0 truncate font-semibold text-text-primary">{g.name}</span>
              <span className="flex shrink-0 items-center gap-1 font-black text-text-primary">
                {g.currentValue} {g.unit}
                {g.status === 'progressing' && <CheckCircle2 size={12} className="text-success" />}
              </span>
            </div>
          ))}
        </div>
      )}

      {waiting.length > 0 && (
        <p className="text-xs text-text-muted">
          {waiting.map((g) => g.name).join(', ')} — czekają na pomiar. Ustaw go, żeby zobaczyć postęp.
        </p>
      )}
      {error && <p className="text-xs text-text-muted">Nie udało się wczytać celów treningowych.</p>}

      {showProposal && (
        <div className="space-y-1 rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-black text-text-primary">Na kolejny tydzień: {ACTION_LABEL[proposal.action] ?? proposal.action}</p>
          <p className="text-xs leading-relaxed text-text-secondary">{proposal.rationale}</p>
        </div>
      )}
    </section>
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
  const pulse = useWeeklyBodyPulse(userId ?? '');
  return <HealthCoachWeeklyReviewView review={review} activity={pulse.data} isLoading={isLoading} error={error} />;
}
