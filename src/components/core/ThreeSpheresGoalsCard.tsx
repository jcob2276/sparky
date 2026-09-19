import { useState, memo } from 'react';
import { Sparkles, Compass, SunMedium, Moon, ImageIcon, Shield, Zap, Wallet } from 'lucide-react';
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
    dotBg: 'bg-warning',
  },
  duch: {
    icon: Zap,
    borderColor: 'border-primary/30',
    bgActive: 'bg-primary/10',
    badgeText: 'text-primary',
    dotBg: 'bg-primary',
  },
  cialo: {
    icon: Shield,
    borderColor: 'border-success/30',
    bgActive: 'bg-success/10',
    badgeText: 'text-success',
    dotBg: 'bg-success',
  },
};


export const ThreeSpheresGoalsCard = memo(function ThreeSpheresGoalsCard() {
  const session = useSession();
  const userId = session?.user?.id ?? '';
  const s = useDashboardContext();

  const [showVisionBoard, setShowVisionBoard] = useState(false);
  const { data: visionItems = [] } = useVisionItemsQuery(userId);

  const imageItems = visionItems.filter((item: VisionBoardItemRow) => item.type === 'image');

  return (
    <section className="rounded-3xl border border-border-custom/70 bg-surface-solid/30 p-4 shadow-sm backdrop-blur-xs space-y-4">
      {/* Header with Vision Board button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Compass size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
              Gwiazda Polarna · 3 Sfery
            </h3>
            <p className="text-3xs font-semibold text-text-muted">
              Konto · Duch · Ciało
            </p>
          </div>
        </div>

        {imageItems.length > 0 && (
          <Pressable
            variant="tonal"
            size="sm"
            onClick={() => setShowVisionBoard((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-2xs font-bold text-primary hover:bg-primary/20 ui-interactive cursor-pointer"
          >
            <ImageIcon size={12} />
            <span>Wizja ({imageItems.length})</span>
          </Pressable>
        )}
      </div>

      {/* Vision Board Preview Drawer */}
      {showVisionBoard && imageItems.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-surface/50 p-3 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between text-2xs font-bold text-text-muted">
            <span className="flex items-center gap-1 text-primary">
              <Sparkles size={12} /> Tablica Marzeń & Wizja
            </span>
            <Pressable
              onClick={() => s.navigate('/desktop?tab=kierunek')}
              className="text-primary hover:underline cursor-pointer"
            >
              Zarządzaj tablicą →
            </Pressable>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {imageItems.map((item) => (
              <div
                key={item.id}
                className="h-24 w-36 shrink-0 overflow-hidden rounded-xl border border-border-custom/50 bg-surface shadow-xs"
              >
                <img
                  src={item.content}
                  alt="Wizja"
                  className="h-full w-full object-cover transition-transform hover:scale-105 duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3 Spheres List */}
      <div className="grid gap-2.5">
        {PILLAR_ORDER.map((pillar) => {
          const cfg = PILLAR_CONFIG[pillar];
          const goal = NORTH_STAR_SPHERES[pillar];
          const Icon = cfg.icon;

          return (
            <div
              key={pillar}
              className={`rounded-2xl border ${cfg.borderColor} bg-surface-2/40 p-3 transition-colors`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cfg.bgActive} ${cfg.badgeText}`}
                >
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-3xs font-black uppercase tracking-widest ${cfg.badgeText}`}>
                      {goal.title}
                    </span>
                    <span className="text-3xs font-bold text-text-muted">
                      {goal.metric}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold leading-snug text-text-primary">
                    {goal.affirmation}
                  </p>
                  <div className="mt-2 border-t border-border-custom/40 pt-1.5">
                    <p className="text-2xs font-semibold italic text-text-secondary">
                      <span className="font-bold not-italic text-text-muted">Dlaczego: </span>
                      {goal.why}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zaplanuj dziś & Podsumuj dzień Actions */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <Pressable
          onClick={() => {
            s.setShowMorningPlan(true);
          }}
          className="flex items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-3 py-3 text-xs font-black uppercase tracking-wider text-primary hover:bg-primary/20 active:scale-95 ui-interactive shadow-xs cursor-pointer text-center"
        >
          <SunMedium size={16} className="shrink-0" />
          <span className="truncate">Zaplanuj</span>
        </Pressable>

        <Pressable
          onClick={() => {
            s.setShowShutdown(true);
          }}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border-custom bg-surface-2/70 px-3 py-3 text-xs font-black uppercase tracking-wider text-text-primary hover:bg-surface-2 active:scale-95 ui-interactive shadow-xs cursor-pointer text-center"
        >
          <Moon size={16} className="shrink-0 text-text-muted" />
          <span className="truncate">Podsumuj</span>
        </Pressable>
      </div>
    </section>
  );
});
