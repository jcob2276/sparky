import { useState, memo } from 'react';
import { Shield, Zap, Wallet, ChevronDown, ChevronUp, Compass, ArrowRight } from 'lucide-react';
import { useWeeklyBodyPulse } from '../../lib/biometricsApi';
import { useDirectionContext } from '../lifestyle/direction/hooks/useDirectionContext';
import { NORTH_STAR_SPHERES, type PillarId } from '../../lib/projects/pillars';
import { useUserId } from '../../store/useStore';
import { getTodayWarsaw } from '../../lib/date';
import { getWeekStartWarsaw } from '../../lib/growth/growth';
import { Pressable } from '../ui/ControlPrimitives';

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
    shortMetric: '15% BF · 100kg',
  },
};

interface SphereExpandedProps {
  pillar: PillarId;
  sleepAvg?: number | null;
  gymCount: number;
  runCount: number;
  activeProjectsCount: number;
  weekGoals: { cialo: string | null; duch: string | null; konto: string | null; intention: string | null };
  onClose: () => void;
}

function WeeklySphereDetailsDrawer({
  pillar,
  sleepAvg,
  gymCount,
  runCount,
  activeProjectsCount,
  weekGoals,
  onClose,
}: SphereExpandedProps) {
  const cfg = PILLAR_CONFIG[pillar];
  const goal = NORTH_STAR_SPHERES[pillar];

  let historySummary: string;
  let weekGoalText: string;

  if (pillar === 'cialo') {
    historySummary = `Sen śr. ${sleepAvg != null ? `${sleepAvg.toFixed(1)}h` : '—'} · Siłownia: ${gymCount}× · Bieg: ${runCount}×`;
    weekGoalText = weekGoals.cialo || goal.affirmation;
  } else if (pillar === 'duch') {
    historySummary = weekGoals.intention ? `Intencja: ${weekGoals.intention}` : 'Spokój, relacje, nawyki, rytm poranka i wieczoru';
    weekGoalText = weekGoals.duch || goal.affirmation;
  } else {
    historySummary = `${activeProjectsCount} aktywnych projektów · Ruch w zadaniach i priorytetach`;
    weekGoalText = weekGoals.konto || goal.affirmation;
  }

  return (
    <div className="rounded-2xl border border-border-custom/50 bg-surface-2/60 p-3.5 space-y-2.5 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-border-custom/40 pb-1.5">
        <span className={`text-2xs font-black uppercase tracking-wider ${cfg.badgeText}`}>
          {cfg.title}: {goal.title} ({goal.metric})
        </span>
        <Pressable
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-3xs text-text-muted hover:text-text-primary cursor-pointer"
        >
          Zwiń
        </Pressable>
      </div>

      <div className="rounded-xl bg-background/50 p-2.5 border border-border-custom/40 space-y-1">
        <span className="text-3xs font-bold uppercase tracking-wider text-text-muted block">
          Ostatnie 7 dni:
        </span>
        <p className="text-xs font-semibold text-text-secondary leading-snug">
          {historySummary}
        </p>
      </div>

      <div className="border-t border-border-custom/30 pt-1.5 space-y-1">
        <span className={`flex items-center gap-1 text-3xs font-bold uppercase tracking-wider ${cfg.badgeText}`}>
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

  const { data: bodyData } = useWeeklyBodyPulse(userId);
  const direction = useDirectionContext(userId, weekStart);
  const [selectedPillar, setSelectedPillar] = useState<PillarId | null>(null);

  const weekGoals = direction.weekGoals ?? { cialo: null, duch: null, konto: null, intention: null };
  const sleepAvg = bodyData?.sleepAvgHours;
  const gymCount = bodyData?.gymCount ?? 0;
  const runCount = bodyData?.runCount ?? 0;
  const activeProjectsCount = direction.activeProjects?.length ?? 0;

  const togglePillar = (p: PillarId) => {
    setSelectedPillar(prev => prev === p ? null : p);
  };

  const getPillarSubtitle = (pillar: PillarId) => {
    if (pillar === 'cialo') {
      const parts: string[] = [];
      if (sleepAvg != null) parts.push(`${sleepAvg.toFixed(1)}h sen`);
      parts.push(`${gymCount + runCount} tr.`);
      return parts.join(' · ');
    }
    if (pillar === 'duch') {
      return weekGoals.intention ? 'Intencja aktywna' : 'Rytm & spokój';
    }
    return `${activeProjectsCount} ${activeProjectsCount === 1 ? 'projekt' : 'projekty'}`;
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
            <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
              Status 7 Dni
            </h3>
            <span className="text-3xs font-semibold text-text-muted">
              · 3 Sfery
            </span>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 border border-primary/25 px-2 py-0.5 text-3xs font-black uppercase tracking-wider text-primary">
          Synteza
        </span>
      </div>

      {/* 3 Compact Columns */}
      <div className="grid grid-cols-3 gap-2">
        {PILLAR_ORDER.map((pillar) => {
          const cfg = PILLAR_CONFIG[pillar];
          const Icon = cfg.icon;
          const isSelected = selectedPillar === pillar;
          const subtitle = getPillarSubtitle(pillar);

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
                <span className={`text-3xs font-black uppercase tracking-wider ${cfg.badgeText}`}>
                  {cfg.title}
                </span>
                <Icon size={13} className={cfg.badgeText} />
              </div>

              <div className="mt-2 min-w-0">
                <p className="truncate text-xs font-black text-text-primary tracking-tight">
                  {cfg.shortMetric}
                </p>
                <p className="mt-0.5 truncate text-3xs font-medium text-text-muted">
                  {subtitle}
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
          sleepAvg={sleepAvg}
          gymCount={gymCount}
          runCount={runCount}
          activeProjectsCount={activeProjectsCount}
          weekGoals={weekGoals}
          onClose={() => setSelectedPillar(null)}
        />
      )}
    </section>
  );
});
