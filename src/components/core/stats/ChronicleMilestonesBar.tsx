import { memo, useMemo } from 'react';
import { Trophy, TrendingDown, TrendingUp, Dumbbell, Calendar, Flame } from 'lucide-react';
import type { Tables } from '../../../lib/database.types';
import type { WorkoutSessionRow } from '../hooks/useStatsData';

type BodyMetricRow = Tables<'body_metrics'>;

interface ChronicleMilestonesBarProps {
  bodyData: BodyMetricRow[];
  recentSessions: WorkoutSessionRow[];
  latestBody: {
    weight: number | null;
    waist: number | null;
    body_fat: number | null;
  } | null;
}

export const ChronicleMilestonesBar = memo(function ChronicleMilestonesBar({
  bodyData,
  recentSessions,
  latestBody,
}: ChronicleMilestonesBarProps) {
  const stats = useMemo(() => {
    // 1. Days of transformation
    const firstMetric = bodyData.find(b => b.date && (b.weight != null || b.waist != null));
    const days = firstMetric?.date
      ? Math.max(1, Math.floor((Date.now() - new Date(firstMetric.date).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // 2. Weight trajectory
    const startWeight = firstMetric?.weight ?? null;
    const curWeight = latestBody?.weight ?? (bodyData.length > 0 ? bodyData[bodyData.length - 1].weight : null);
    const weightDiff = startWeight != null && curWeight != null
      ? Math.round((curWeight - startWeight) * 10) / 10
      : null;

    // 3. Waist trajectory
    const firstWaistMetric = bodyData.find(b => b.waist != null);
    const startWaist = firstWaistMetric?.waist ?? null;
    const curWaist = latestBody?.waist ?? (bodyData.length > 0 ? bodyData[bodyData.length - 1].waist : null);
    const waistDiff = startWaist != null && curWaist != null
      ? Math.round((curWaist - startWaist) * 10) / 10
      : null;

    // 4. Peak workout tonnage
    const peakTonnageKg = recentSessions.reduce((max, s) => {
      const logs = s.exercise_logs || [];
      const sessionTonnage = logs.reduce((acc, l) => {
        const w = Number(l.weight) || 0;
        const r = Number(l.reps) || 0;
        return acc + (w > 0 && r > 0 ? w * r : 0);
      }, 0);
      return Math.max(max, sessionTonnage);
    }, 0);

    const peakTonnageMg = peakTonnageKg > 0 ? (peakTonnageKg / 1000).toFixed(1) : null;

    return {
      days,
      startWeight,
      curWeight,
      weightDiff,
      startWaist,
      curWaist,
      waistDiff,
      bodyFat: latestBody?.body_fat ?? null,
      totalSessions: recentSessions.length,
      peakTonnageMg,
    };
  }, [bodyData, recentSessions, latestBody]);

  return (
    <section aria-label="Kamienie milowe transformacji" className="rounded-2xl border border-border-custom bg-gradient-to-br from-surface-solid/80 via-surface/60 to-surface-solid/40 p-4 sm:p-5 shadow-sm space-y-3.5">
      {/* Top row: Days & Transformation Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/20">
            <Trophy size={14} />
          </div>
          <div>
            <p className="text-3xs font-black uppercase tracking-widest text-primary font-display">
              Trajektoria Transformacji
            </p>
            <h3 className="text-sm font-black text-text-primary tracking-tight">
              {stats.days > 0 ? `${stats.days}. dzień drogi` : 'Rozpocznij zapisy'}
            </h3>
          </div>
        </div>

        {stats.days > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-3xs font-black uppercase text-primary font-mono">
            <Calendar size={11} />
            +{stats.days}d
          </span>
        )}
      </div>

      {/* Grid of milestone indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Waga */}
        <div className="rounded-xl border border-border-custom/70 bg-surface/70 p-2.5">
          <span className="text-3xs font-bold text-text-muted uppercase">Waga</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-black text-text-primary font-mono leading-none">
              {stats.curWeight != null ? `${stats.curWeight}` : '--'}
            </span>
            <span className="text-3xs text-text-muted font-bold">kg</span>
          </div>
          {stats.weightDiff != null && (
            <div className={`mt-1.5 flex items-center gap-0.5 text-3xs font-bold font-mono ${stats.weightDiff <= 0 ? 'text-success' : 'text-warning'}`}>
              {stats.weightDiff <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              <span>{stats.weightDiff > 0 ? `+${stats.weightDiff}` : `${stats.weightDiff}`} kg</span>
            </div>
          )}
        </div>

        {/* Talia */}
        <div className="rounded-xl border border-border-custom/70 bg-surface/70 p-2.5">
          <span className="text-3xs font-bold text-text-muted uppercase">Talia</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-black text-text-primary font-mono leading-none">
              {stats.curWaist != null ? `${stats.curWaist}` : '--'}
            </span>
            <span className="text-3xs text-text-muted font-bold">cm</span>
          </div>
          {stats.waistDiff != null && (
            <div className={`mt-1.5 flex items-center gap-0.5 text-3xs font-bold font-mono ${stats.waistDiff <= 0 ? 'text-success' : 'text-warning'}`}>
              {stats.waistDiff <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              <span>{stats.waistDiff > 0 ? `+${stats.waistDiff}` : `${stats.waistDiff}`} cm</span>
            </div>
          )}
        </div>

        {/* Rekord Tonażu */}
        <div className="rounded-xl border border-border-custom/70 bg-surface/70 p-2.5">
          <span className="text-3xs font-bold text-text-muted uppercase">Max Tonaż</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-black text-text-primary font-mono leading-none">
              {stats.peakTonnageMg ?? '--'}
            </span>
            <span className="text-3xs text-text-muted font-bold">Mg</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-3xs font-bold text-text-muted">
            <Flame size={12} className="text-warning" />
            <span>Rekord sesji</span>
          </div>
        </div>

        {/* Sesje siłowe */}
        <div className="rounded-xl border border-border-custom/70 bg-surface/70 p-2.5">
          <span className="text-3xs font-bold text-text-muted uppercase">Siłownia</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-black text-text-primary font-mono leading-none">
              {stats.totalSessions}
            </span>
            <span className="text-3xs text-text-muted font-bold">sesji</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-3xs font-bold text-text-muted">
            <Dumbbell size={12} className="text-primary" />
            <span>Zapisanych</span>
          </div>
        </div>
      </div>
    </section>
  );
});
