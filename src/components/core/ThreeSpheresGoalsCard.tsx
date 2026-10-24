import { useState, memo } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { buildNorthStarSpheres, type PillarId } from '../../lib/projects/pillars';
import { useVisionItemsQuery, type VisionBoardItemRow } from '../../lib/dreamsApi';
import { useSession } from '../../store/useStore';
import { useLifeTargets } from '../../lib/lifeTargetsApi';
import { PILLAR_CONFIG, PILLAR_ORDER } from './sphereGoals/sphereGoalsConfig';
import { SphereDetailsDrawer } from './sphereGoals/SphereDrawers';
import { VisionTilesRow } from './sphereGoals/VisionTilesRow';

/** „Twoje cele” — 3 sfery Gwiazdy Polarnej jako poziomy rząd scroll-snap; tap rozwija szczegóły sfery. */
export const ThreeSpheresGoalsCard = memo(function ThreeSpheresGoalsCard() {
  const session = useSession();
  const userId = session?.user?.id ?? '';
  const spheres = buildNorthStarSpheres(useLifeTargets(userId));

  const [selectedPillar, setSelectedPillar] = useState<PillarId | null>(null);

  const { data: visionItems = [] } = useVisionItemsQuery(userId);
  const imageItems = visionItems.filter((item: VisionBoardItemRow) => item.type === 'image');

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
          const goal = spheres[pillar];
          const Icon = cfg.icon;
          const isSelected = selectedPillar === pillar;

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
                  <Icon size={14} aria-hidden="true" />
                </span>
              </span>
              <span className="relative break-words text-base font-semibold leading-tight text-on-accent">
                {goal.short}
              </span>
            </Pressable>
          );
        })}
      </div>

      {selectedPillar && (
        <SphereDetailsDrawer
          pillar={selectedPillar}
          onClose={() => setSelectedPillar(null)}
        />
      )}

      <div className="pt-2">
        <VisionTilesRow items={imageItems} />
      </div>
    </section>
  );
});
