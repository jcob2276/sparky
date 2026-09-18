import {
  Dumbbell,
  HeartPulse,
  Brain,
} from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

export type DesktopTabType = 'training' | 'health' | 'intel';

interface Props {
  activeTab: DesktopTabType;
  onTabChange: (tab: DesktopTabType) => void;
}

const TABS: { id: DesktopTabType; label: string; icon: typeof Dumbbell }[] = [
  { id: 'training', label: 'Trening', icon: Dumbbell },
  { id: 'health', label: 'Zdrowie', icon: HeartPulse },
  { id: 'intel', label: 'Pamięć', icon: Brain },
];

export default function DesktopQuickActionsBar({
  activeTab,
  onTabChange,
}: Props) {
  return (
    <div className="xl:hidden pb-1">
      {/* Przełącznik Widoków / Segmented Control — widoczny na węższych ekranach gdy ukryty jest panel boczny */}
      <div className="flex items-center gap-1 p-1 bg-surface-solid/5 border border-border-custom/70 rounded-2xl w-full">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <Pressable
              key={id}
              variant="ghost"
              onClick={() => onTabChange(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold ui-interactive min-w-0 ${
                isActive
                  ? 'bg-primary text-on-accent shadow-sm font-black'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-solid/10'
              }`}
              icon={<Icon size={14} className="shrink-0" />}
            >
              <span className="truncate">{label}</span>
            </Pressable>
          );
        })}
      </div>
    </div>
  );
}
