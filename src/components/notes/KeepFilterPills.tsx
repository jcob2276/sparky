import { Pressable } from '../ui/ControlPrimitives';
import { CheckSquare, Paperclip, LockKeyhole, Pin, StickyNote } from 'lucide-react';

export type KeepQuickFilter = 'all' | 'pinned' | 'todos' | 'attachments' | 'locked';

interface KeepFilterPillsProps {
  activeFilter: KeepQuickFilter;
  onChangeFilter: (filter: KeepQuickFilter) => void;
  counts?: {
    all: number;
    pinned: number;
    todos: number;
    attachments: number;
    locked: number;
  };
}

const PILLS: Array<{ id: KeepQuickFilter; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: 'all', label: 'Wszystkie', icon: StickyNote },
  { id: 'pinned', label: 'Przypięte', icon: Pin },
  { id: 'todos', label: 'Zadaniowe', icon: CheckSquare },
  { id: 'attachments', label: 'Załączniki', icon: Paperclip },
  { id: 'locked', label: 'Zablokowane', icon: LockKeyhole },
];

export default function KeepFilterPills({ activeFilter, onChangeFilter, counts }: KeepFilterPillsProps) {
  const visiblePills = PILLS.filter((pill) => {
    if (pill.id === 'all') return true;
    if (activeFilter === pill.id) return true;
    if (counts && counts[pill.id] === 0) return false;
    return true;
  });

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 no-scrollbar select-none overscroll-x-contain touch-pan-x pr-8" role="tablist">
      {visiblePills.map((pill) => {
        const Icon = pill.icon;
        const isActive = activeFilter === pill.id;
        const count = counts ? counts[pill.id] : undefined;

        return (
          <Pressable
            key={pill.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChangeFilter(pill.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ui-interactive duration-[var(--motion-fast)] btn-press cursor-pointer ${
              isActive
                ? 'bg-primary text-on-accent shadow-xs'
                : 'bg-surface-solid/80 hover:bg-surface-solid border border-border-custom/30 text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={12} className={isActive ? 'text-on-accent' : 'text-text-muted'} />
            <span>{pill.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-3xs font-black ${
                  isActive ? 'bg-on-accent/20 text-on-accent' : 'bg-surface-2/40 text-text-muted'
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
