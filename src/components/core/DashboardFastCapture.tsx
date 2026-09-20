import { memo, useMemo } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { Plus, Shield, Zap, Wallet } from 'lucide-react';
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
  category?: 'operacje' | 'strategia_zdrowie';
}

interface Props {
  show: boolean;
  onClose: () => void;
  items: FastCaptureItem[];
  tools: ToolItem[];
  userId?: string;
  onRefresh?: () => void;
}

interface ActionTile {
  label: string;
  icon?: LucideIcon;
  action: () => void;
  route?: string;
  colorClass: string;
}

function buildFastCaptureSections(items: FastCaptureItem[], tools: ToolItem[]) {
  const cialoActions: ActionTile[] = [];
  const kontoActions: ActionTile[] = [];
  const duchActions: ActionTile[] = [];
  const otherActions: ActionTile[] = [];

  items.forEach((item) => {
    const lower = item.label.toLowerCase();
    if (lower.includes('trening') || lower.includes('saun') || lower.includes('wzrok') || lower.includes('wag') || lower.includes('jedzenie')) {
      cialoActions.push({
        label: item.label,
        icon: item.icon,
        action: item.action,
        colorClass: 'bg-success/10 text-success border-success/20 hover:border-success/40',
      });
    } else {
      cialoActions.push({
        label: item.label,
        icon: item.icon,
        action: item.action,
        colorClass: 'bg-primary/10 text-primary border-primary/20 hover:border-primary/40',
      });
    }
  });

  tools.forEach((tool) => {
    const lower = tool.label.toLowerCase();
    if (lower.includes('zadani') || lower.includes('kalendarz') || lower.includes('notatk') || lower.includes('keep')) {
      kontoActions.push({
        label: tool.label,
        icon: tool.icon,
        action: tool.action,
        route: tool.route,
        colorClass: 'bg-warning/10 text-warning border-warning/20 hover:border-warning/40',
      });
    } else if (lower.includes('finans') || lower.includes('pocket') || lower.includes('termin') || lower.includes('rozwój') || lower.includes('rozwoj')) {
      duchActions.push({
        label: tool.label,
        icon: tool.icon,
        action: tool.action,
        route: tool.route,
        colorClass: 'bg-primary/10 text-primary border-primary/20 hover:border-primary/40',
      });
    } else {
      otherActions.push({
        label: tool.label,
        icon: tool.icon,
        action: tool.action,
        route: tool.route,
        colorClass: 'bg-surface-2/70 text-text-primary border-border-custom/40 hover:border-primary/30',
      });
    }
  });

  const kontoPriority = ['zadani', 'kalendarz', 'notatk', 'keep'];
  kontoActions.sort((a, b) => {
    const idxA = kontoPriority.findIndex(k => a.label.toLowerCase().includes(k));
    const idxB = kontoPriority.findIndex(k => b.label.toLowerCase().includes(k));
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  const duchPriority = ['finans', 'termin', 'rozwój', 'rozwoj', 'pocket'];
  duchActions.sort((a, b) => {
    const idxA = duchPriority.findIndex(k => a.label.toLowerCase().includes(k));
    const idxB = duchPriority.findIndex(k => b.label.toLowerCase().includes(k));
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  return [
    {
      id: 'cialo',
      title: 'Ciało & Biometria',
      icon: Shield,
      accent: 'text-success',
      tiles: cialoActions,
    },
    {
      id: 'konto',
      title: 'Konto & Działanie',
      icon: Wallet,
      accent: 'text-warning',
      tiles: kontoActions,
    },
    {
      id: 'duch',
      title: 'Duch & Wiedza',
      icon: Zap,
      accent: 'text-primary',
      tiles: duchActions,
    },
    ...(otherActions.length > 0 ? [{
      id: 'inne',
      title: 'Pozostałe narzędzia',
      icon: Plus,
      accent: 'text-text-muted',
      tiles: otherActions,
    }] : []),
  ];
}

export const DashboardFastCaptureMenu = memo(function DashboardFastCaptureMenu({ show, onClose, items, tools, userId }: Props) {
  const { selection } = useHaptics();

  const handleAction = (act: () => void) => {
    selection();
    act();
    onClose();
  };

  const sections = useMemo(() => buildFastCaptureSections(items, tools), [items, tools]);

  return (
    <Sheet
      open={show}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      side="bottom"
      title="Szybkie akcje"
    >
      <div className="mx-auto max-w-md space-y-4 pb-6 pt-1 max-h-[72vh] overflow-y-auto pr-0.5">
        {sections.map((sec) => {
          if (sec.tiles.length === 0) return null;
          const SecIcon = sec.icon;

          return (
            <div key={sec.id} className="rounded-2xl border border-border-custom/40 bg-surface/30 p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 px-1">
                <SecIcon size={13} className={sec.accent} />
                <span className={`text-2xs font-black uppercase tracking-widest ${sec.accent}`}>
                  {sec.title}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {sec.tiles.map((tile) => {
                  const Icon = tile.icon;

                  return (
                    <Pressable
                      key={tile.label}
                      variant="ghost"
                      aria-label={tile.label}
                      onClick={() => handleAction(tile.action)}
                      onMouseEnter={() => {
                        if (tile.route && userId) prefetchWorkspaceRoute(userId, tile.route);
                      }}
                      onTouchStart={() => {
                        if (tile.route && userId) prefetchWorkspaceRoute(userId, tile.route);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-center active:scale-95 transition-transform cursor-pointer"
                    >
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-xs transition-colors ${tile.colorClass}`}>
                        {Icon ? <Icon size={20} /> : <Plus size={20} />}
                      </div>
                      <span className="text-2xs font-bold tracking-tight text-text-primary line-clamp-1 w-full text-center">
                        {tile.label}
                      </span>
                    </Pressable>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
});

