import {
  Apple,
  Dumbbell,
  Flame,
  Activity,
  Mic,
  Eye,
  LayoutGrid,
  Scale,
  Zap,
  Target,
  HeartPulse,
  Brain,
  Layers,
} from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

export type DesktopTabType = 'cockpit' | 'training' | 'direction' | 'health' | 'intel' | 'all';

interface Props {
  activeTab: DesktopTabType;
  onTabChange: (tab: DesktopTabType) => void;
  onOpenFood: () => void;
  onOpenWorkout: () => void;
  onOpenWeight: () => void;
  onOpenSauna: () => void;
  onOpenConfounder: () => void;
  onOpenStream: () => void;
  onOpenOptics: () => void;
  onOpenTools: () => void;
  naukaBadge?: number;
}

const TABS: { id: DesktopTabType; label: string; icon: typeof Zap }[] = [
  { id: 'cockpit', label: 'Dziś & Cockpit', icon: Zap },
  { id: 'training', label: 'Trening & Ciało', icon: Dumbbell },
  { id: 'direction', label: 'Kierunek & Cele', icon: Target },
  { id: 'health', label: 'Kartoteka & Zdrowie', icon: HeartPulse },
  { id: 'intel', label: 'Pamięć & Analityka', icon: Brain },
  { id: 'all', label: 'Wszystko', icon: Layers },
];

export default function DesktopQuickActionsBar({
  activeTab,
  onTabChange,
  onOpenFood,
  onOpenWorkout,
  onOpenWeight,
  onOpenSauna,
  onOpenConfounder,
  onOpenStream,
  onOpenOptics,
  onOpenTools,
  naukaBadge,
}: Props) {
  return (
    <div className="space-y-3 pb-1">
      {/* Szybkie Akcje / One-Click Loggers */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-surface-solid/5 border border-border-custom/80 rounded-2xl px-4 py-2.5 backdrop-blur-[var(--blur-md)] shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xs font-black uppercase tracking-wider text-text-muted mr-1 hidden sm:inline">
            Szybki Wpis:
          </span>
          <Pressable
            variant="ghost"
            onClick={onOpenFood}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-success/20 bg-success/10 hover:bg-success/15 text-success text-xs font-bold"
            icon={<Apple size={14} />}
          >
            + Jedzenie
          </Pressable>
          <Pressable
            variant="ghost"
            onClick={onOpenWorkout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-warning/20 bg-warning/10 hover:bg-warning/15 text-warning text-xs font-bold"
            icon={<Dumbbell size={14} />}
          >
            + Trening
          </Pressable>
          <Pressable
            variant="ghost"
            onClick={onOpenWeight}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-info/20 bg-info/10 hover:bg-info/15 text-info text-xs font-bold"
            icon={<Scale size={14} />}
          >
            + Waga
          </Pressable>
          <Pressable
            variant="ghost"
            onClick={onOpenSauna}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-warning/20 bg-warning/10 hover:bg-warning/15 text-warning text-xs font-bold"
            icon={<Flame size={14} />}
          >
            + Sauna
          </Pressable>
          <Pressable
            variant="ghost"
            onClick={onOpenConfounder}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-danger/20 bg-danger/10 hover:bg-danger/15 text-danger text-xs font-bold"
            icon={<Activity size={14} />}
          >
            + Sygnał Dnia
          </Pressable>
          <Pressable
            variant="ghost"
            onClick={onOpenStream}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/10 hover:bg-primary/15 text-primary text-xs font-bold"
            icon={<Mic size={14} />}
          >
            + Strumień
          </Pressable>
          <Pressable
            variant="ghost"
            onClick={onOpenOptics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/10 hover:bg-primary/15 text-primary text-xs font-bold"
            icon={<Eye size={14} />}
          >
            Wzrok
          </Pressable>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Pressable
            variant="ghost"
            onClick={onOpenTools}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 text-primary text-xs font-black uppercase tracking-wide relative"
            icon={<LayoutGrid size={15} />}
          >
            <span>Narzędzia</span>
            {naukaBadge != null && naukaBadge > 0 && (
              <span className="h-4 min-w-4 rounded-full bg-danger text-on-accent px-1 text-3xs font-bold leading-4">
                {naukaBadge}
              </span>
            )}
          </Pressable>
        </div>
      </div>

      {/* Przełącznik Widoków / Segmented Control — widoczny na węższych ekranach gdy ukryty jest panel boczny */}
      <div className="flex xl:hidden items-center gap-1 p-1 bg-surface-solid/5 border border-border-custom/70 rounded-2xl overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <Pressable
              key={id}
              variant="ghost"
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-primary text-on-accent shadow-sm font-black'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-solid/10'
              }`}
              icon={<Icon size={14} />}
            >
              {label}
            </Pressable>
          );
        })}
      </div>
    </div>
  );
}
