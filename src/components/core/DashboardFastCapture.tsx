import { memo } from 'react';
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

export const DashboardFastCaptureMenu = memo(function DashboardFastCaptureMenu({ show, onClose, items, tools, userId }: Props) {
  const { selection } = useHaptics();

  const run = (item: FastCaptureItem) => {
    selection();
    item.action();
    onClose();
  };

  const itemStyles: Record<string, string> = {
    'Dodaj Jedzenie': 'bg-status-success/10 text-status-success border-status-success/20',
    'Zaloguj Trening': 'bg-status-warning/10 text-status-warning border-status-warning/20',
    'Wpisz Wagę': 'bg-primary/10 text-primary border-primary/20',
    'Zaloguj Saunę': 'bg-status-warning/10 text-status-warning border-status-warning/20',
    'Zmierz Wzrok': 'bg-primary/10 text-primary border-primary/20',
  };

  return (
    <Sheet
        open={show}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        side="bottom"
        title="Szybkie akcje"
      >
        <div className="mx-auto max-w-md space-y-5 pb-4">
          {/* Szybkie dodawanie */}
          <div>
            <p className="ios-section-label mb-2 px-1">Dodaj wpis</p>
            <div className="grid grid-cols-3 gap-2.5">
              {items.map((item) => {
                const { label, icon: Icon } = item;
                const style = itemStyles[label] || 'bg-surface-2/60 text-primary border-border-custom/40';
                return (
                  <Pressable
                    key={label}
                    variant="ghost"
                    onClick={() => run(item)}
                    className="flex flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center active:scale-95 transition-transform"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm ${style}`}>
                      {Icon ? <Icon size={22} /> : <Plus size={22} />}
                    </div>
                    <span className="text-2xs font-semibold tracking-tight text-text-primary line-clamp-2">{label}</span>
                  </Pressable>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-border-custom/40" />

          {/* Narzędzia */}
          <div>
            <p className="ios-section-label mb-2 px-1">Narzędzia</p>
            <div className="grid grid-cols-3 gap-2.5 max-h-[38vh] overflow-y-auto pr-0.5">
              {tools.map(({ label, icon: Icon, action, route }) => (
                <Pressable
                  key={label}
                  variant="ghost"
                  onClick={() => {
                    selection();
                    action();
                    onClose();
                  }}
                  onMouseEnter={() => {
                    if (route) prefetchWorkspaceRoute(userId, route);
                  }}
                  onTouchStart={() => {
                    if (route) prefetchWorkspaceRoute(userId, route);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center active:scale-95 transition-transform"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border-custom/40 bg-surface-2/60 text-text-primary shadow-sm hover:border-primary/30 transition-colors">
                    <Icon size={19} />
                  </div>
                  <span className="text-2xs font-semibold tracking-tight text-text-primary truncate w-full">{label}</span>
                </Pressable>
              ))}
            </div>
          </div>
        </div>
      </Sheet>
  );
});
