import { useState } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Fab from '../ui/Fab';
import Sheet from '../ui/Sheet';
import { useHaptics } from '../../hooks/useHaptics';
import DesktopQuickConfounderModal from '../desktop/shell/DesktopQuickConfounderModal';
import DesktopQuickStreamModal from '../desktop/shell/DesktopQuickStreamModal';

export interface FastCaptureItem {
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

export function DashboardFastCaptureMenu({ show, onClose, items, tools, userId, onRefresh }: Props) {
  const { selection } = useHaptics();
  const [showConfounder, setShowConfounder] = useState(false);
  const [showStream, setShowStream] = useState(false);

  const run = (item: FastCaptureItem) => {
    selection();
    if (item.label === 'Sygnał Dnia') {
      setShowConfounder(true);
      onClose();
      return;
    }
    if (item.label === 'Zrzut Strumienia') {
      setShowStream(true);
      onClose();
      return;
    }
    item.action();
    onClose();
  };

  const itemStyles: Record<string, string> = {
    'Dodaj Jedzenie': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'Zaloguj Trening': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    'Wpisz Wagę': 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    'Zaloguj Saunę': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    'Zmierz Wzrok': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    'Sygnał Dnia': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    'Zrzut Strumienia': 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  };

  return (
    <>
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
                const style = itemStyles[label] || 'bg-black/5 dark:bg-white/5 text-primary border-black/8 dark:border-white/10';
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

          <div className="h-px bg-black/8 dark:bg-white/10" />

          {/* Narzędzia */}
          <div>
            <p className="ios-section-label mb-2 px-1">Narzędzia</p>
            <div className="grid grid-cols-3 gap-2.5 max-h-[38vh] overflow-y-auto pr-0.5">
              {tools.map(({ label, icon: Icon, action }) => (
                <Pressable
                  key={label}
                  variant="ghost"
                  onClick={() => {
                    selection();
                    action();
                    onClose();
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center active:scale-95 transition-transform"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/8 dark:border-white/10 bg-black/5 dark:bg-white/5 text-text-primary shadow-sm hover:border-primary/30 transition-colors">
                    <Icon size={19} />
                  </div>
                  <span className="text-2xs font-semibold tracking-tight text-text-primary truncate w-full">{label}</span>
                </Pressable>
              ))}
            </div>
          </div>
        </div>
      </Sheet>

      {showConfounder && (
        <DesktopQuickConfounderModal
          isOpen={showConfounder}
          onClose={() => setShowConfounder(false)}
          userId={userId}
        />
      )}

      {showStream && (
        <DesktopQuickStreamModal
          isOpen={showStream}
          onClose={() => setShowStream(false)}
          userId={userId}
          onSaved={onRefresh}
        />
      )}
    </>
  );
}

interface FabProps {
  active: boolean;
  onToggle: () => void;
}

export function DashboardFastCaptureFAB({ active, onToggle }: FabProps) {
  const { selection } = useHaptics();
  if (active) return null;

  return (
    <Fab
      position="bottom-center"
      size="sm"
      onClick={() => {
        selection();
        onToggle();
      }}
      title="Otwórz akcje i narzędzia"
      className="fast-capture-btn shadow-lg"
      style={{ bottom: 'max(24px, env(safe-area-inset-bottom))' }}
    >
      <Plus size={20} strokeWidth={2.5} />
    </Fab>
  );
}
