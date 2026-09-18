import { memo } from 'react';
import { Shield, Zap, Wallet, ArrowRight, Activity } from 'lucide-react';
import { useWeeklyBodyPulse } from '../../lib/biometricsApi';
import { useDirectionContext } from '../lifestyle/direction/hooks/useDirectionContext';
import { NORTH_STAR_SPHERES } from '../../lib/projects/pillars';
import { useUserId } from '../../store/useStore';
import { getTodayWarsaw } from '../../lib/date';
import { getWeekStartWarsaw } from '../../lib/growth/growth';

export const WeeklySpheresOverviewCard = memo(function WeeklySpheresOverviewCard() {
  const userId = useUserId() ?? '';
  const today = getTodayWarsaw();
  const weekStart = getWeekStartWarsaw(today);

  const { data: bodyData } = useWeeklyBodyPulse(userId);
  const direction = useDirectionContext(userId, weekStart);

  const weekGoals = direction.weekGoals ?? { cialo: null, duch: null, konto: null, intention: null };
  const sleepAvg = bodyData?.sleepAvgHours;
  const gymCount = bodyData?.gymCount ?? 0;
  const runCount = bodyData?.runCount ?? 0;
  const activeProjectsCount = direction.activeProjects?.length ?? 0;

  return (
    <section className="rounded-3xl border border-border-custom/70 bg-surface-solid/40 p-4.5 shadow-sm backdrop-blur-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Activity size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
              Status 7 Dni & Cele na Kolejny Tydzień
            </h3>
            <p className="text-3xs font-semibold text-text-muted">
              Synteza 3 Sfer: Ciało · Duch · Konto
            </p>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 border border-primary/25 px-2.5 py-0.5 text-3xs font-black uppercase tracking-wider text-primary">
          Podsumowanie
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* Ciało */}
        <div className="rounded-2xl border border-success/30 bg-surface-2/40 p-3.5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-widest text-success">
                <Shield size={13} /> Ciało
              </span>
              <span className="text-3xs font-bold text-text-muted">
                {NORTH_STAR_SPHERES.cialo.metric}
              </span>
            </div>

            <div className="rounded-xl bg-background/50 p-2 border border-border-custom/40 space-y-1">
              <span className="text-3xs font-bold uppercase tracking-wider text-text-muted block">
                7 Dni wstecz:
              </span>
              <p className="text-xs font-bold text-text-primary">
                Sen: {sleepAvg != null ? `${sleepAvg.toFixed(1)}h` : '—'}
              </p>
              <p className="text-2xs font-semibold text-text-secondary">
                Siłownia: {gymCount}× · Bieg: {runCount}×
              </p>
            </div>
          </div>

          <div className="border-t border-border-custom/30 pt-2 space-y-1">
            <span className="flex items-center gap-1 text-3xs font-bold uppercase tracking-wider text-success">
              <ArrowRight size={10} /> Cel na nowy tydzień:
            </span>
            <p className="text-xs font-bold text-text-primary leading-snug">
              {weekGoals.cialo || NORTH_STAR_SPHERES.cialo.affirmation}
            </p>
          </div>
        </div>

        {/* Duch */}
        <div className="rounded-2xl border border-primary/30 bg-surface-2/40 p-3.5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-widest text-primary">
                <Zap size={13} /> Duch
              </span>
              <span className="text-3xs font-bold text-text-muted">
                {NORTH_STAR_SPHERES.duch.metric}
              </span>
            </div>

            <div className="rounded-xl bg-background/50 p-2 border border-border-custom/40 space-y-1">
              <span className="text-3xs font-bold uppercase tracking-wider text-text-muted block">
                7 Dni wstecz:
              </span>
              <p className="text-xs font-bold text-text-primary truncate">
                {weekGoals.intention ? `Intencja: ${weekGoals.intention}` : 'Spokój, relacje, nawyki'}
              </p>
              <p className="text-2xs font-semibold text-text-secondary">
                Rytm poranka i wieczoru
              </p>
            </div>
          </div>

          <div className="border-t border-border-custom/30 pt-2 space-y-1">
            <span className="flex items-center gap-1 text-3xs font-bold uppercase tracking-wider text-primary">
              <ArrowRight size={10} /> Cel na nowy tydzień:
            </span>
            <p className="text-xs font-bold text-text-primary leading-snug">
              {weekGoals.duch || NORTH_STAR_SPHERES.duch.affirmation}
            </p>
          </div>
        </div>

        {/* Konto */}
        <div className="rounded-2xl border border-warning/30 bg-surface-2/40 p-3.5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-widest text-warning">
                <Wallet size={13} /> Konto
              </span>
              <span className="text-3xs font-bold text-text-muted">
                {NORTH_STAR_SPHERES.konto.metric}
              </span>
            </div>

            <div className="rounded-xl bg-background/50 p-2 border border-border-custom/40 space-y-1">
              <span className="text-3xs font-bold uppercase tracking-wider text-text-muted block">
                7 Dni wstecz:
              </span>
              <p className="text-xs font-bold text-text-primary">
                {activeProjectsCount} aktywnych projektów
              </p>
              <p className="text-2xs font-semibold text-text-secondary">
                Ruch w zadaniach i priorytetach
              </p>
            </div>
          </div>

          <div className="border-t border-border-custom/30 pt-2 space-y-1">
            <span className="flex items-center gap-1 text-3xs font-bold uppercase tracking-wider text-warning">
              <ArrowRight size={10} /> Cel na nowy tydzień:
            </span>
            <p className="text-xs font-bold text-text-primary leading-snug">
              {weekGoals.konto || NORTH_STAR_SPHERES.konto.affirmation}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
});

