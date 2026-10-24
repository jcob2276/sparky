import { Pressable } from '../../ui/ControlPrimitives';
import { buildNorthStarSpheres, type PillarId } from '../../../lib/projects/pillars';
import { useLifeTargets } from '../../../lib/lifeTargetsApi';
import { useUserId } from '../../../store/useStore';
import { PILLAR_CONFIG } from './sphereGoalsConfig';

interface SphereDetailsProps {
  pillar: PillarId;
  onClose: () => void;
}

export function SphereDetailsDrawer({ pillar, onClose }: SphereDetailsProps) {
  const cfg = PILLAR_CONFIG[pillar];
  const goal = buildNorthStarSpheres(useLifeTargets(useUserId() ?? ''))[pillar];

  return (
    <div className="rounded-2xl border border-border-custom/50 bg-surface-2/60 p-3.5 space-y-2.5 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-border-custom/40 pb-1.5">
        <span className={`text-2xs font-semibold tracking-wide ${cfg.badgeText}`}>
          Cel Sfery: {goal.title} ({goal.metric})
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

      <p className="text-xs font-bold leading-relaxed text-text-primary italic">
        „{goal.affirmation}”
      </p>

      <div className="border-t border-border-custom/30 pt-1.5">
        <p className="text-2xs font-semibold italic text-text-secondary">
          <span className="font-bold not-italic text-text-muted">Dlaczego: </span>
          {goal.why}
        </p>
      </div>
    </div>
  );
}
