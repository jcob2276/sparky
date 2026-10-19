import { useState, memo } from 'react';
import { Moon, Utensils, CheckSquare, ChevronDown } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import WeeklyBodyPulse from './WeeklyBodyPulse';
import WeeklyNutritionPulse from './WeeklyNutritionPulse';
import WeeklyWinsMap from './WeeklyWinsMap';

type PulseTab = 'sleep' | 'nutrition' | 'discipline';

const TABS = [
  { id: 'sleep', label: 'Sen', icon: Moon },
  { id: 'nutrition', label: 'Jedzenie', icon: Utensils },
  { id: 'discipline', label: 'Dni', icon: CheckSquare },
] as const;

interface WeeklyPulseHubProps {
  weeklyCalories: number;
  refreshSignal: number;
}

/** Szczegóły tygodnia — zwinięte; dane pobierane dopiero po otwarciu. */
export const WeeklyPulseHub = memo(function WeeklyPulseHub({ weeklyCalories, refreshSignal }: WeeklyPulseHubProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PulseTab>('nutrition');

  return (
    <div className="space-y-3">
      <Pressable
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between rounded-3xl border border-border-custom/60 bg-surface/70 px-4 py-3 text-left"
      >
        <span className="text-sm font-bold text-text-primary">Szczegóły tygodnia: sen, jedzenie, dni</span>
        <ChevronDown size={16} className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </Pressable>

      {open && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex rounded-2xl border border-border-custom/50 bg-surface-solid/50 p-1 text-3xs font-black uppercase tracking-wider">
            {TABS.map(({ id, label, icon: Icon }) => (
              <Pressable
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 transition-all ${
                  activeTab === id ? 'bg-primary text-on-accent shadow-xs' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Icon size={12} />
                <span>{label}</span>
              </Pressable>
            ))}
          </div>
          {activeTab === 'sleep' && <WeeklyBodyPulse />}
          {activeTab === 'nutrition' && <WeeklyNutritionPulse weeklyCalories={weeklyCalories} refreshSignal={refreshSignal} />}
          {activeTab === 'discipline' && <WeeklyWinsMap />}
        </div>
      )}
    </div>
  );
});
