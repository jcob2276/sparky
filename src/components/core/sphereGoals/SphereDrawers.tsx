import { Sparkles, Trophy, Flame } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import { NORTH_STAR_SPHERES, type PillarId } from '../../../lib/projects/pillars';
import type { VisionBoardItemRow } from '../../../lib/dreamsApi';
import { PILLAR_CONFIG, type MarathonStats } from './sphereGoalsConfig';

export function VisionBoardDrawer({ items }: { items: VisionBoardItemRow[] }) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-surface/50 p-3 space-y-2 animate-fadeIn">
      <div className="flex items-center justify-between text-2xs font-bold text-text-muted">
        <span className="flex items-center gap-1 text-primary">
          <Sparkles size={12} /> Tablica Marzeń & Wizja
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
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
  marathon: MarathonStats;
  onClose: () => void;
}

export function SphereDetailsDrawer({ pillar, marathon, onClose }: SphereDetailsProps) {
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
