import { Activity, Beef, CheckCircle2, Dumbbell } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import { useDashboardContext } from './context/DashboardContext';
import { useHaptics } from '../../hooks/useHaptics';

export default function TodayStatusStrip() {
  const { readiness, proteinToday, proteinTarget = 150, hasWorkoutToday, navigate } = useDashboardContext();
  const haptics = useHaptics();

  const proteinPct = Math.min(100, Math.round((proteinToday / proteinTarget) * 100));

  const readinessScore = Math.round(readiness);
  const readinessTone = readinessScore >= 75
    ? 'text-success border-success/30 bg-success/5'
    : readinessScore >= 55
    ? 'text-warning border-warning/30 bg-warning/5'
    : readinessScore > 0
    ? 'text-danger border-danger/30 bg-danger/5'
    : 'text-text-muted border-border-custom/40 bg-surface-solid/30';

  const scrollToMeals = () => {
    haptics.selection();
    const el = document.getElementById('meal-composer');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const goToTraining = () => {
    haptics.selection();
    navigate('/trening');
  };

  const goToBiometrics = () => {
    haptics.selection();
    navigate('/oura');
  };

  return (
    <section className="space-y-2.5" aria-label="Status dnia">
      {/* 3 Glanceable Metric Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Gotowość */}
        <Pressable
          onClick={goToBiometrics}
          className={`flex flex-col justify-between rounded-2xl border p-3 text-left ui-interactive active:scale-95 ${readinessTone}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-3xs font-black uppercase tracking-wider">Gotowość</span>
            <Activity size={14} />
          </div>
          <div className="mt-2">
            <span className="text-xl font-black tracking-tight">
              {readinessScore > 0 ? readinessScore : '—'}
            </span>
            <span className="ml-0.5 text-2xs text-text-muted">/100</span>
          </div>
          <p className="mt-1 truncate text-3xs font-bold">
            {readinessScore >= 75 ? 'Optymalna' : readinessScore >= 55 ? 'Średnia' : readinessScore > 0 ? 'Niska' : 'Brak danych'}
          </p>
        </Pressable>

        {/* Białko */}
        <Pressable
          onClick={scrollToMeals}
          className="flex flex-col justify-between rounded-2xl border border-border-custom/70 bg-surface-solid/30 p-3 text-left ui-interactive hover:border-primary/40 active:scale-95"
        >
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-3xs font-black uppercase tracking-wider">Białko</span>
            <Beef size={14} className="text-primary" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-black tracking-tight text-text-primary">
              {Math.round(proteinToday)}
            </span>
            <span className="ml-0.5 text-2xs font-medium text-text-muted">g</span>
          </div>
          <div className="mt-1 space-y-1">
            <div className="h-1 w-full overflow-hidden rounded-full bg-border-custom/50">
              <div
                className="h-full rounded-full bg-primary ui-interactive"
                style={{ width: `${proteinPct}%` }}
              />
            </div>
            <p className="text-3xs font-bold text-text-muted">{proteinPct}% celu</p>
          </div>
        </Pressable>

        {/* Trening */}
        <Pressable
          onClick={goToTraining}
          className={`flex flex-col justify-between rounded-2xl border p-3 text-left ui-interactive active:scale-95 ${
            hasWorkoutToday
              ? 'border-success/30 bg-success/5 text-success'
              : 'border-border-custom/70 bg-surface-solid/30 text-text-primary hover:border-border-custom'
          }`}
        >
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-3xs font-black uppercase tracking-wider">Trening</span>
            {hasWorkoutToday ? (
              <CheckCircle2 size={14} className="text-success" />
            ) : (
              <Dumbbell size={14} className="text-text-muted" />
            )}
          </div>
          <div className="mt-2">
            <span className="text-base font-black tracking-tight">
              {hasWorkoutToday ? 'Zrobiony' : 'Przed Tobą'}
            </span>
          </div>
          <p className="mt-1 truncate text-3xs font-bold text-text-muted">
            {hasWorkoutToday ? 'Dobra robota' : 'Zaplanuj sesję'}
          </p>
        </Pressable>
      </div>
    </section>
  );
}

