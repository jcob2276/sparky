import { memo, useMemo } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { Plus, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { prefetchWorkspaceRoute } from '../../lib/workspacePrefetch';

interface FastCaptureItem {
  id?: string;
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
  id?: string;
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

/** Jedna sugestia zależna od pory dnia; „Domknij dzień” dopiero od 20:00. */
function pickSuggestion(hour: number): { id: string; title: string; hint: string } {
  if (hour >= 20) return { id: 'shutdown', title: 'Domknij dzień', hint: 'Podsumowanie i plan na jutro' };
  if (hour < 10) return { id: 'meal', title: 'Zapisz śniadanie', hint: 'Pora na pierwszy posiłek' };
  if (hour < 15) return { id: 'meal', title: 'Zapisz obiad', hint: 'Pora posiłku' };
  return { id: 'meal', title: 'Zapisz kolację', hint: 'Dopnij makra na dziś' };
}

function AppIcon({ tile, badge, onRun, onWarm }: { tile: Tile; badge?: number; onRun: () => void; onWarm?: () => void }) {
  const Icon = tile.icon;
  return (
    <Pressable
      variant="ghost"
      aria-label={badge ? `${tile.label}, ${badge} pilnych` : tile.label}
      onClick={onRun}
      onMouseEnter={onWarm}
      onTouchStart={onWarm}
      className="group flex w-full flex-col items-center gap-1.5 text-center active:scale-95"
    >
      <span
        className="relative flex aspect-square w-full max-w-[64px] items-center justify-center rounded-[18px] border border-[var(--border)] bg-surface-2 text-text-primary"
        style={tile.color ? { color: tile.color, backgroundColor: `color-mix(in srgb, ${tile.color} 14%, transparent)` } : undefined}
      >
        <Icon size={24} aria-hidden="true" />
        {!!badge && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-2xs font-bold tabular-nums text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="w-full truncate text-xs font-medium text-text-primary">{tile.label}</span>
    </Pressable>
  );
}

export const DashboardFastCaptureMenu = memo(function DashboardFastCaptureMenu({ show, onClose, items, tools, userId, badges }: Props) {
  const logTiles = useMemo<Tile[]>(
    () => items.map((item) => ({ id: item.id, label: item.label, icon: item.icon ?? Plus, action: item.action, color: item.color, hint: item.hint })),
    [items],
  );
  const navTiles = useMemo<Tile[]>(
    () => tools.map((tool) => ({ label: tool.label, icon: tool.icon, action: tool.action, route: tool.route, hint: tool.hint })),
    [tools],
  );
  const hour = show ? new Date().getHours() : 12;
  const suggestion = useMemo(() => pickSuggestion(hour), [hour]);
  const hero = logTiles.find((tile) => tile.id === suggestion.id);
  const visibleLog = logTiles.filter((tile) => tile.id !== 'shutdown' && tile !== hero);
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
      <div className="space-y-5 pb-2">
        {hero && (
          <Pressable
            variant="ghost"
            aria-label={suggestion.title}
            onClick={() => run(hero)}
            className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] p-3.5 text-left active:scale-[0.98]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] text-primary">
              <Sparkles size={22} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-text-primary">{suggestion.title}</span>
              <span className="block truncate text-xs text-text-muted">{suggestion.hint}</span>
            </span>
          </Pressable>
        )}

        {visibleLog.length > 0 && (
          <section className="space-y-3" aria-label="Rejestruj">
            <SectionTitle>Rejestruj</SectionTitle>
            <div className="grid grid-cols-4 gap-2">
              {visibleLog.map((tile) => (
                <AppIcon key={tile.label} tile={tile} onRun={() => run(tile)} />
              ))}
            </div>
          </section>
        )}

        {navTiles.length > 0 && (
          <section className="space-y-3" aria-label="Przejdź do">
            <SectionTitle>Przejdź do</SectionTitle>
            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
              {navTiles.map((tile) => (
                <AppIcon
                  key={tile.label}
                  tile={tile}
                  badge={tile.route ? badges?.[tile.route] ?? 0 : 0}
                  onRun={() => run(tile)}
                  onWarm={() => warm(tile)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </Sheet>
  );
});
