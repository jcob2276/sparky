import {
  Dumbbell,
  HeartPulse,
  Brain,
  Layers,
} from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

export type DesktopTabType = 'training' | 'direction' | 'health' | 'intel' | 'all';

interface Props {
  activeTab: DesktopTabType;
  onTabChange: (tab: DesktopTabType) => void;
}

const TABS: { id: DesktopTabType; label: string; icon: typeof Dumbbell }[] = [
  { id: 'training', label: 'Trening & Ciało', icon: Dumbbell },
  { id: 'health', label: 'Kartoteka & Zdrowie', icon: HeartPulse },
  { id: 'intel', label: 'Pamięć & Analityka', icon: Brain },
  { id: 'all', label: 'Wszystko', icon: Layers },
];

export default function DesktopQuickActionsBar({
  activeTab,
  onTabChange,
}: Props) {
  return (
    <div className="xl:hidden pb-1">
      {/* Przełącznik Widoków / Segmented Control — widoczny na węższych ekranach gdy ukryty jest panel boczny */}
      <div className="flex items-center gap-1 p-1 bg-surface-solid/5 border border-border-custom/70 rounded-2xl overflow-x-auto">
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
