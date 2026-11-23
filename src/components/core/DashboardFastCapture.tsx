import { memo, useMemo } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { prefetchWorkspaceRoute } from '../../lib/workspacePrefetch';

interface FastCaptureItem {
  label: string;
  emoji: string;
  color: string;
  icon?: LucideIcon;
  action: () => void;
  hint?: string;
}

interface ToolItem {
  label: string;
  icon: LucideIcon;
  action: () => void;
  route?: string;
  hint?: string;
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
  hint?: string;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 px-0.5">
      <span className="text-2xs font-bold uppercase tracking-wider text-text-muted">
        {children}
      </span>
      <div className="h-px flex-1 bg-[var(--border)] opacity-50" />
    </div>
  );
}

export const DashboardFastCaptureMenu = memo(function DashboardFastCaptureMenu({ show, onClose, items, tools, userId, badges }: Props) {
  const logTiles = useMemo<Tile[]>(
    () => items.map((item) => ({ label: item.label, icon: item.icon ?? Plus, action: item.action, color: item.color, hint: item.hint })),
    [items],
  );
  const navTiles = useMemo<Tile[]>(
    () => tools.map((tool) => ({ label: tool.label, icon: tool.icon, action: tool.action, route: tool.route, hint: tool.hint })),
    [tools],
  );
  const run = (tile: Tile) => {
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
      handleDragOnly
    >
      <div className="space-y-6 pb-2">
        {logTiles.length > 0 && (
          <section className="space-y-2.5" aria-label="Rejestruj">
            <SectionTitle>Rejestruj</SectionTitle>
            <div className={`grid gap-2.5 ${logTiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {logTiles.map((tile, index) => {
                const Icon = tile.icon;
                const spanBoth = logTiles.length % 2 === 1 && index === logTiles.length - 1 && logTiles.length > 1;
                const tint = tile.color ?? 'var(--color-primary)';
                return (
                  <Pressable
                    key={tile.label}
                    variant="ghost"
                    aria-label={tile.label}
                    onClick={() => run(tile)}
                    className={`group relative flex min-h-[60px] w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-surface-solid p-3 text-left shadow-xs transition-all duration-150 hover:border-text-muted/30 hover:bg-surface-2 active:scale-[0.98] ${spanBoth ? 'col-span-2' : ''}`}
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105"
                      style={{
                        color: tint,
                        backgroundColor: `color-mix(in srgb, ${tint} 14%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${tint} 24%, transparent)`,
                      }}
                    >
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold leading-tight text-text-primary">
                        {tile.label}
                      </p>
                      {tile.hint && (
                        <p className="mt-0.5 truncate text-3xs font-medium text-text-muted">
                          {tile.hint}
                        </p>
                      )}
                    </div>
                  </Pressable>
                );
              })}
            </div>
          </section>
        )}

        {navTiles.length > 0 && (
          <section className="space-y-2.5" aria-label="Przejdź do">
            <SectionTitle>Przejdź do</SectionTitle>
            <div className="grid grid-cols-3 gap-2.5">
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
                    className="group flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-surface-solid p-3 text-center shadow-xs transition-all duration-150 hover:border-text-muted/30 hover:bg-surface-2 active:scale-95"
                  >
                    <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-text-primary transition-transform duration-150 group-hover:scale-105">
                      <Icon size={20} aria-hidden="true" />
                      {badge > 0 && (
                        <span className="absolute -right-2 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-2xs font-bold tabular-nums text-white shadow-xs">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate text-xs font-semibold text-text-primary">
                      {tile.label}
                    </span>
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
