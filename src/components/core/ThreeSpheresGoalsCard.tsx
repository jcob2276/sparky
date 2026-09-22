import { useState, memo, useMemo } from 'react';
import { Sparkles, Compass, ImageIcon, Shield, Zap, Wallet, ChevronDown, ChevronUp, Trophy, Flame } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import { NORTH_STAR_SPHERES, type PillarId } from '../../lib/projects/pillars';
import { useVisionItemsQuery, type VisionBoardItemRow } from '../../lib/dreamsApi';
import { useDashboardContext } from './context/DashboardContext';
import { useSession } from '../../store/useStore';

const PILLAR_ORDER: PillarId[] = ['konto', 'duch', 'cialo'];

const PILLAR_CONFIG = {
  konto: {
    icon: Wallet,
    borderColor: 'border-warning/30',
    bgActive: 'bg-warning/10',
    badgeText: 'text-warning',
    shortMetric: '15k zł / msc',
    tag: 'Finanse',
  },
  duch: {
    icon: Zap,
    borderColor: 'border-primary/30',
    bgActive: 'bg-primary/10',
    badgeText: 'text-primary',
    shortMetric: 'Relacje',
    tag: 'Energia',
  },
  cialo: {
    icon: Shield,
    borderColor: 'border-success/30',
    bgActive: 'bg-success/10',
    badgeText: 'text-success',
    shortMetric: '15% BF · 100kg',
    tag: 'Sylwetka',
  },
};

const RACE_DATE_DEFAULT = '2026-10-04T00:00:00';
const RACE_NAME_DEFAULT = 'Maraton w Koszycach';
const PREP_START_DATE = '2026-06-15T00:00:00';

function getMarathonStats() {
  const now = Date.now();
  const target = new Date(RACE_DATE_DEFAULT).getTime();
  const start = new Date(PREP_START_DATE).getTime();
  const daysLeft = Math.ceil((target - now) / 86400000);
  const totalPrepDays = Math.max(1, Math.ceil((target - start) / 86400000));
  const elapsedDays = Math.max(0, Math.ceil((now - start) / 86400000));
  const progressPct = Math.min(100, Math.max(0, Math.round((elapsedDays / totalPrepDays) * 100)));
  const weeksLeft = Math.floor(daysLeft / 7);
  const remainingDays = daysLeft % 7;
  return { daysLeft, progressPct, weeksLeft, remainingDays, name: RACE_NAME_DEFAULT };
}

interface VisionBoardDrawerProps {
  items: VisionBoardItemRow[];
  onNavigate: (path: string) => void;
}

function VisionBoardDrawer({ items, onNavigate }: VisionBoardDrawerProps) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-surface/50 p-3 space-y-2 animate-fadeIn">
      <div className="flex items-center justify-between text-2xs font-bold text-text-muted">
        <span className="flex items-center gap-1 text-primary">
          <Sparkles size={12} /> Tablica Marzeń & Wizja
        </span>
        <Pressable
          onClick={() => onNavigate('/desktop?tab=kierunek')}
          className="text-primary hover:underline cursor-pointer"
        >
          Zarządzaj tablicą →
        </Pressable>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {items.map((item) => (
          <div
            key={item.id}
            className="h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-border-custom/50 bg-surface shadow-xs"
          >
            <img
              src={item.content}
              alt="Wizja"
              className="h-full w-full object-cover transition-transform hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface SphereDetailsProps {
  pillar: PillarId;
  marathon: ReturnType<typeof getMarathonStats>;
  onClose: () => void;
}

function SphereDetailsDrawer({ pillar, marathon, onClose }: SphereDetailsProps) {
  const cfg = PILLAR_CONFIG[pillar];
  const goal = NORTH_STAR_SPHERES[pillar];

  return (
    <div className="rounded-2xl border border-border-custom/50 bg-surface-2/60 p-3.5 space-y-2.5 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-border-custom/40 pb-1.5">
        <span className={`text-2xs font-black uppercase tracking-wider ${cfg.badgeText}`}>
          Cel Sfery: {goal.title} ({goal.metric})
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

      <p className="text-xs font-bold leading-relaxed text-text-primary italic">
        „{goal.affirmation}”
      </p>

      <div className="border-t border-border-custom/30 pt-1.5">
        <p className="text-2xs font-semibold italic text-text-secondary">
          <span className="font-bold not-italic text-text-muted">Dlaczego: </span>
          {goal.why}
        </p>
      </div>

      {pillar === 'cialo' && marathon.daysLeft > 0 && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-2.5 space-y-1.5 mt-2">
          <div className="flex items-center justify-between text-2xs font-black text-text-primary">
            <span className="flex items-center gap-1 text-success">
              <Trophy size={13} /> {marathon.name}
            </span>
            <span className="text-3xs text-text-muted">
              {marathon.daysLeft} dni ({marathon.weeksLeft} tyg. {marathon.remainingDays} d)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-border-custom/40 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${marathon.progressPct}%` }}
              />
            </div>
            <span className="inline-flex items-center gap-0.5 text-3xs font-black text-success">
              <Flame size={10} /> {marathon.progressPct}% cyklu
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export const ThreeSpheresGoalsCard = memo(function ThreeSpheresGoalsCard() {
  const session = useSession();
  const userId = session?.user?.id ?? '';
  const s = useDashboardContext();

  const [showVisionBoard, setShowVisionBoard] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState<PillarId | null>(null);

  const { data: visionItems = [] } = useVisionItemsQuery(userId);
  const imageItems = visionItems.filter((item: VisionBoardItemRow) => item.type === 'image');
  const marathon = useMemo(() => getMarathonStats(), []);

  const togglePillar = (p: PillarId) => {
    setSelectedPillar(prev => prev === p ? null : p);
  };

  return (
    <section className="rounded-3xl border border-border-custom/70 bg-surface-solid/40 p-4 shadow-sm backdrop-blur-xs space-y-3">
      {/* Header with Vision Board button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Compass size={15} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
              Gwiazda Polarna
            </h3>
            <span className="text-3xs font-semibold text-text-muted">
              · 3 Sfery
            </span>
          </div>
        </div>

        {imageItems.length > 0 && (
          <Pressable
            variant="tonal"
            size="sm"
            onClick={() => setShowVisionBoard((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-2 py-1 text-3xs font-bold text-primary hover:bg-primary/20 ui-interactive cursor-pointer"
          >
            <ImageIcon size={11} />
            <span>Wizja ({imageItems.length})</span>
          </Pressable>
        )}
      </div>

      {showVisionBoard && imageItems.length > 0 && (
        <VisionBoardDrawer items={imageItems} onNavigate={s.navigate} />
      )}

      {/* 3 Compact Glanceable Columns */}
      <div className="grid grid-cols-3 gap-2">
        {PILLAR_ORDER.map((pillar) => {
          const cfg = PILLAR_CONFIG[pillar];
          const goal = NORTH_STAR_SPHERES[pillar];
          const Icon = cfg.icon;
          const isSelected = selectedPillar === pillar;

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
                  {goal.title}
                </span>
                <Icon size={13} className={cfg.badgeText} />
              </div>

              <div className="mt-2 min-w-0">
                <p className="truncate text-xs font-black text-text-primary tracking-tight">
                  {cfg.shortMetric}
                </p>
                {pillar === 'cialo' && marathon.daysLeft > 0 ? (
                  <span className="mt-1 inline-flex items-center gap-0.5 rounded-md bg-success/15 px-1 py-0.2 text-3xs font-black text-success">
                    🏃 {marathon.daysLeft}d
                  </span>
                ) : (
                  <p className="mt-0.5 truncate text-3xs font-medium text-text-muted">
                    {cfg.tag}
                  </p>
                )}
              </div>

              <div className="mt-1.5 flex justify-end text-text-muted/60">
                {isSelected ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </div>
            </Pressable>
          );
        })}
      </div>

      {selectedPillar && (
        <SphereDetailsDrawer
          pillar={selectedPillar}
          marathon={marathon}
          onClose={() => setSelectedPillar(null)}
        />
      )}
    </section>
  );
});
