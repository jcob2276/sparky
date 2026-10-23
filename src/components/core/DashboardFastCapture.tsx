import { memo, useMemo } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { useHaptics } from '../../hooks/useHaptics';
import { prefetchWorkspaceRoute } from '../../lib/workspacePrefetch';

interface FastCaptureItem {
  label: string;
  emoji: string;
  color: string;
  icon?: LucideIcon;
  action: () => void;
}

interface ToolItem {
  label: string;
  icon: LucideIcon;
  action: () => void;
  route?: string;
}

interface Props {
  show: boolean;
  onClose: () => void;
  /** Things you log (training, sauna, eyesight…). */
  items: FastCaptureItem[];
  /** Places you jump to (tasks, calendar, notes…). */
  tools: ToolItem[];
  userId?: string;
  onRefresh?: () => void;
  /** Counters shown on navigation tiles, keyed by route (e.g. { todo: 3 }). */
  badges?: Record<string, number>;
}

interface Tile {
  label: string;
  icon: LucideIcon;
  action: () => void;
  route?: string;
  color?: string;
}

function SectionTitle({ children }: { children: string }) {
  return <p className="px-1 text-xs font-semibold tracking-wide text-text-muted">{children}</p>;
}

export const DashboardFastCaptureMenu = memo(function DashboardFastCaptureMenu({ show, onClose, items, tools, userId, badges }: Props) {
  const { selection } = useHaptics();

  const logTiles = useMemo<Tile[]>(
    () => items.map((item) => ({ label: item.label, icon: item.icon ?? Plus, action: item.action, color: item.color })),
    [items],
  );
  const navTiles = useMemo<Tile[]>(
    () => tools.map((tool) => ({ label: tool.label, icon: tool.icon, action: tool.action, route: tool.route })),
    [tools],
  );
  const run = (tile: Tile) => {
    selection();
    tile.action();
    onClose();
  };
  const warm = (tile: Tile) => {
    if (tile.route && userId) prefetchWorkspaceRoute(userId, tile.route);
  };

  return (
    <Sheet
      open={show}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      side="bottom"
      title="Szybkie akcje"
      compact
    >
      <div className="space-y-6 pb-2">
        {logTiles.length > 0 && (
          <section className="space-y-3" aria-label="Zaloguj">
            <SectionTitle>Zaloguj</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              {logTiles.map((tile) => {
                const Icon = tile.icon;
                const tint = tile.color ?? 'currentColor';
                return (
                  <Pressable
                    key={tile.label}
                    variant="ghost"
                    aria-label={tile.label}
                    onClick={() => run(tile)}
                    className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-black/8 bg-surface-2 p-3 text-left transition-colors hover:bg-surface-3 active:scale-[0.97] dark:border-white/10"
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ color: tint, backgroundColor: `color-mix(in srgb, ${tint} 16%, transparent)` }}
                    >
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold leading-tight text-text-primary">{tile.label}</span>
                  </Pressable>
                );
              })}
            </div>
          </section>
        )}

        {navTiles.length > 0 && (
          <section className="space-y-3" aria-label="Przejdź do">
            <SectionTitle>Przejdź do</SectionTitle>
            <div className="grid grid-cols-4 gap-2">
              {navTiles.map((tile) => {
                const Icon = tile.icon;
                const badge = tile.route ? badges?.[tile.route] ?? 0 : 0;
                return (
                  <Pressable
                    key={tile.label}
                    variant="ghost"
                    aria-label={badge > 0 ? `${tile.label}, ${badge} pilnych` : tile.label}
                    onClick={() => run(tile)}
                    onMouseEnter={() => warm(tile)}
                    onTouchStart={() => warm(tile)}
                    className="flex min-h-18 flex-col items-center justify-center gap-2 rounded-2xl border border-black/8 bg-surface-2 px-1 py-3 text-center transition-colors hover:bg-surface-3 active:scale-95 dark:border-white/10"
                  >
                    <span className="relative flex h-6 w-6 items-center justify-center text-text-primary">
                      <Icon size={22} aria-hidden="true" />
                      {badge > 0 && (
                        <span className="absolute -right-3 -top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold tabular-nums text-on-accent">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate text-xs font-medium text-text-secondary">{tile.label}</span>
                  </Pressable>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Sheet>
  );
});
