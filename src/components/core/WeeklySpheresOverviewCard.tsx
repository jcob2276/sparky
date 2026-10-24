import { useState, memo } from 'react';
import { Shield, Zap, Wallet, ChevronDown, ChevronUp, Compass, ArrowRight } from 'lucide-react';
import { useWeeklyBodyPulse } from '../../lib/biometricsApi';
import { useWeeklyWinsMap } from '../../lib/weeklyWinsMap';
import { useDirectionContext } from '../lifestyle/direction/hooks/useDirectionContext';
import { NORTH_STAR_SPHERES, type PillarId } from '../../lib/projects/pillars';
import { useUserId } from '../../store/useStore';
import { getTodayWarsaw } from '../../lib/date';
import { getWeekStartWarsaw } from '../../lib/growth/growth';
import { Pressable } from '../ui/ControlPrimitives';
import DataStateNotice from './DataStateNotice';
import { GOAL_BODY_SHORT } from '../../lib/lifeGoals';

const PILLAR_ORDER: PillarId[] = ['konto', 'duch', 'cialo'];

const PILLAR_CONFIG = {
  konto: {
    icon: Wallet,
    title: 'Konto',
    borderColor: 'border-warning/30',
    bgActive: 'bg-warning/10',
    badgeText: 'text-warning',
    shortMetric: '15k zł / msc',
  },
  duch: {
    icon: Zap,
    title: 'Duch',
    borderColor: 'border-primary/30',
    bgActive: 'bg-primary/10',
    badgeText: 'text-primary',
    shortMetric: 'Relacje',
  },
  cialo: {
    icon: Shield,
    title: 'Ciało',
    borderColor: 'border-success/30',
    bgActive: 'bg-success/10',
    badgeText: 'text-success',
    shortMetric: GOAL_BODY_SHORT,
  },
};

interface SphereExpandedProps {
  pillar: PillarId;
  activeProjectsCount: number;
  directionLoading?: boolean;
  directionError?: boolean;
  weekGoals: { cialo: string | null; duch: string | null; konto: string | null; intention: string | null };
  onClose: () => void;
}

function WeeklySphereDetailsDrawer({
  pillar,
  activeProjectsCount,
  directionLoading,
  directionError,
  weekGoals,
  onClose,
}: SphereExpandedProps) {
  const cfg = PILLAR_CONFIG[pillar];
  const goal = NORTH_STAR_SPHERES[pillar];

  let historySummary: string | null;
  let weekGoalText: string;

  if (pillar === 'cialo') {
    historySummary = null;
    weekGoalText = weekGoals.cialo || goal.affirmation;
  } else if (pillar === 'duch') {
    historySummary = weekGoals.intention ? `Intencja: ${weekGoals.intention}` : 'Spokój, relacje, nawyki, rytm poranka i wieczoru';
    weekGoalText = weekGoals.duch || goal.affirmation;
  } else {
    if (directionLoading) {
      historySummary = 'Ładuję dane projektów...';
    } else if (directionError) {
      historySummary = 'Nie udało się pobrać projektów';
    } else {
      const projWord = activeProjectsCount === 1 ? 'aktywny projekt' : activeProjectsCount >= 2 && activeProjectsCount <= 4 ? 'aktywne projekty' : 'aktywnych projektów';
      historySummary = `${activeProjectsCount} ${projWord} · Ruch w zadaniach i priorytetach`;
    }
    weekGoalText = weekGoals.konto || goal.affirmation;
  }

  return (
    <div className="rounded-2xl border border-border-custom/50 bg-surface-2/60 p-3.5 space-y-2.5 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-border-custom/40 pb-1.5">
        <span className={`text-2xs font-semibold tracking-wide ${cfg.badgeText}`}>
          {cfg.title}: {goal.title} ({goal.metric})
        </span>
        <Pressable
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-2xs text-text-muted hover:text-text-primary cursor-pointer"
        >
          Zwiń
        </Pressable>
      </div>

      {historySummary && (
        <p className="rounded-xl border border-border-custom/40 bg-background/50 p-2.5 text-xs font-semibold leading-snug text-text-secondary">
          {historySummary}
        </p>
      )}

      <div className="border-t border-border-custom/30 pt-1.5 space-y-1">
        <span className={`flex items-center gap-1 text-2xs font-bold tracking-wide ${cfg.badgeText}`}>
          <ArrowRight size={10} /> Kierunek & Cel na nowy tydzień:
        </span>
        <p className="text-xs font-bold leading-relaxed text-text-primary italic">
          „{weekGoalText}”
        </p>
      </div>
    </div>
  );
}

export const WeeklySpheresOverviewCard = memo(function WeeklySpheresOverviewCard() {
  const userId = useUserId() ?? '';
  const today = getTodayWarsaw();
  const weekStart = getWeekStartWarsaw(today);

  const bodyQuery = useWeeklyBodyPulse(userId);
  const bodyData = bodyQuery.isError ? undefined : bodyQuery.data;
  const direction = useDirectionContext(userId, weekStart);
  const [selectedPillar, setSelectedPillar] = useState<PillarId | null>(null);

  const weekGoals = direction.weekGoals ?? { cialo: null, duch: null, konto: null, intention: null };
  const winsQuery = useWeeklyWinsMap(userId);
  const winDays = winsQuery.data?.filter((d) => d.status === 'win').length ?? null;
  const recovery = bodyData?.averageRecovery ?? null;
  const activeProjectsCount = direction.activeProjects?.length ?? 0;

  const togglePillar = (p: PillarId) => {
    setSelectedPillar(prev => prev === p ? null : p);
  };

  /** Jedna kluczowa liczba na sferę — szczegóły (sen, jedzenie, treningi) są niżej, nie tutaj. */
  const getPillarValue = (pillar: PillarId) => {
    if (pillar === 'cialo') {
      if (bodyQuery.isLoading) return 'Ładuję dane';
      return recovery == null ? 'Brak danych' : `Regeneracja ${recovery}`;
    }
    if (pillar === 'duch') {
      if (winsQuery.isLoading) return 'Ładuję dane';
      return winDays == null ? 'Brak danych' : `${winDays}/7 dni 5/5`;
    }
    if (direction.loading) return 'Ładuję dane';
    if (direction.isError) return 'Błąd odczytu';
    if (activeProjectsCount === 1) return '1 projekt';
    if (activeProjectsCount >= 2 && activeProjectsCount <= 4) return `${activeProjectsCount} projekty`;
    return `${activeProjectsCount} projektów`;
  };

  return (
    <section className="rounded-3xl border border-border-custom/70 bg-surface-solid/40 p-4 shadow-sm backdrop-blur-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Compass size={15} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-xs font-semibold tracking-wide text-text-primary">
              Trzy sfery
            </h3>
          </div>
        </div>
      </div>

      {/* 3 Compact Columns */}
      <div className="grid grid-cols-3 gap-2">
        {PILLAR_ORDER.map((pillar) => {
          const cfg = PILLAR_CONFIG[pillar];
          const Icon = cfg.icon;
          const isSelected = selectedPillar === pillar;
          const value = getPillarValue(pillar);

          return (
            <Pressable
              key={pillar}
              onClick={() => togglePillar(pillar)}
              className={`flex flex-col justify-between rounded-2xl border p-2.5 text-left transition-all ui-interactive cursor-pointer ${
                isSelected
                  ? `${cfg.borderColor} ${cfg.bgActive} ring-1 ring-primary/30 shadow-xs`
                  : 'border-border-custom/60 bg-surface-2/40 hover:bg-surface-2/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-2xs font-semibold tracking-wide ${cfg.badgeText}`}>
                  {cfg.title}
                </span>
                <Icon size={13} className={cfg.badgeText} />
              </div>

              <div className="mt-2 min-w-0">
                <p className="text-xs font-semibold leading-tight tracking-tight text-text-primary">
                  {value}
                </p>
                <p className="mt-0.5 truncate text-2xs font-medium text-text-muted">
                  cel: {cfg.shortMetric}
                </p>
              </div>

              <div className="mt-1.5 flex justify-end text-text-muted/60">
                {isSelected ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </div>
            </Pressable>
          );
        })}
      </div>

      {selectedPillar && (
        <WeeklySphereDetailsDrawer
          pillar={selectedPillar}
          activeProjectsCount={activeProjectsCount}
          directionLoading={direction.loading}
          directionError={direction.isError}
          weekGoals={weekGoals}
          onClose={() => setSelectedPillar(null)}
        />
      )}
      {bodyQuery.isError && <DataStateNotice tone="warning" title="Dane ciała niedostępne" detail={bodyQuery.error?.message} />}
      {direction.isError && <DataStateNotice tone="warning" title="Dane projektów i kierunku niedostępne" detail={direction.error?.message} />}
    </section>
  );
});
