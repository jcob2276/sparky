import { Pressable } from '../../ui/ControlPrimitives';
import {
  Inbox,
  Clock,
  CheckCircle2,
  PlaySquare,
  PenLine,
  Sparkles,
} from 'lucide-react';
import type { LinkQuickFilter } from './linksUtils';

interface LinksFilterPillsProps {
  activeFilter: LinkQuickFilter;
  onChangeFilter: (filter: LinkQuickFilter) => void;
  counts?: Record<LinkQuickFilter, number>;
}

const PILLS: Array<{
  id: LinkQuickFilter;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: 'all', label: 'Wszystkie', icon: Inbox },
  { id: 'unread', label: 'Nieprzeczytane', icon: Clock },
  { id: 'read', label: 'Przeczytane', icon: CheckCircle2 },
  { id: 'videos', label: 'Wideo', icon: PlaySquare },
  { id: 'with_notes', label: 'Z notatkami', icon: PenLine },
  { id: 'with_takeaways', label: 'Z wnioskami', icon: Sparkles },
];

export function LinksFilterPills({
  activeFilter,
  onChangeFilter,
  counts,
}: LinksFilterPillsProps) {
  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 no-scrollbar select-none"
      role="tablist"
      aria-label="Filtry linków"
    >
      {PILLS.map((pill) => {
        const Icon = pill.icon;
        const isActive = activeFilter === pill.id;
        const count = counts ? counts[pill.id] : undefined;

        return (
          <Pressable
            key={pill.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChangeFilter(pill.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ui-interactive duration-[var(--motion-fast)] btn-press cursor-pointer ${
              isActive
                ? 'bg-primary text-on-accent shadow-xs'
                : 'bg-surface-solid/80 hover:bg-surface-solid border border-border-custom/30 text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={13} className={isActive ? 'text-on-accent' : 'text-text-muted'} />
            <span>{pill.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-3xs font-black ${
                  isActive
                    ? 'bg-on-accent/20 text-on-accent'
                    : 'bg-surface-2/40 text-text-muted'
                }`}
              >
                {count}
              </span>
            )}
          </Pressable>
        );
      })}
    </div>
  );
}
