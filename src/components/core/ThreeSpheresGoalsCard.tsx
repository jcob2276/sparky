import { useState, memo, useMemo } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { NORTH_STAR_SPHERES, type PillarId } from '../../lib/projects/pillars';
import { useVisionItemsQuery, type VisionBoardItemRow } from '../../lib/dreamsApi';
import { useSession } from '../../store/useStore';
import { PILLAR_CONFIG, PILLAR_ORDER, getMarathonStats } from './sphereGoals/sphereGoalsConfig';
import { SphereDetailsDrawer } from './sphereGoals/SphereDrawers';
import { VisionTilesRow } from './sphereGoals/VisionTilesRow';

/** „Twoje cele” — 3 sfery Gwiazdy Polarnej jako poziomy rząd scroll-snap; tap rozwija szczegóły sfery. */
export const ThreeSpheresGoalsCard = memo(function ThreeSpheresGoalsCard() {
  const session = useSession();
  const userId = session?.user?.id ?? '';

  const [selectedPillar, setSelectedPillar] = useState<PillarId | null>(null);

  const { data: visionItems = [] } = useVisionItemsQuery(userId);
  const imageItems = visionItems.filter((item: VisionBoardItemRow) => item.type === 'image');
  const marathon = useMemo(() => getMarathonStats(), []);

  const togglePillar = (p: PillarId) => {
    setSelectedPillar((prev) => (prev === p ? null : p));
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-text-secondary">Kierunek</h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PILLAR_ORDER.map((pillar) => {
          const cfg = PILLAR_CONFIG[pillar];
          const goal = NORTH_STAR_SPHERES[pillar];
          const Icon = cfg.icon;
          const isSelected = selectedPillar === pillar;
          const marathonDays = pillar === 'cialo' && marathon.daysLeft > 0 ? marathon.daysLeft : null;

          return (
            <Pressable
              key={pillar}
              onClick={() => togglePillar(pillar)}
              aria-expanded={isSelected}
              title={goal.metric}
              className={`hero-goal-card flex flex-col justify-between min-h-16 rounded-[var(--radius-grouped)] border p-2.5 text-left ui-interactive ${
                isSelected ? `${cfg.borderColor} ring-2 ring-primary` : 'border-border-custom/60'
              }`}
            >
              <img src={cfg.photo} alt="" aria-hidden="true" loading="lazy" decoding="async" className="hero-goal-photo" />
              <span className="hero-goal-scrim" aria-hidden="true" />
              <span className="relative flex items-center justify-between gap-1 text-on-accent">
                <span className="text-xs font-semibold">{goal.title}</span>
                <span className="flex items-center gap-1">
                  {marathonDays !== null && (
                    <span className="text-2xs font-semibold">🏃{marathonDays}d</span>
                  )}
                  <Icon size={14} aria-hidden="true" />
                </span>
              </span>
              <span className="relative break-words text-base font-semibold leading-tight text-on-accent">
                {cfg.shortMetric}
              </span>
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

      <div className="pt-2">
        <VisionTilesRow items={imageItems} />
      </div>
    </section>
  );
});
