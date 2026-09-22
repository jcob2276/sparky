import { useState, memo } from 'react';
import { Activity, Utensils, CheckSquare, LayoutGrid } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import WeeklyBodyPulse from './WeeklyBodyPulse';
import WeeklyNutritionPulse from './WeeklyNutritionPulse';
import WeeklyWinsMap from './WeeklyWinsMap';

type PulseTab = 'body' | 'nutrition' | 'discipline' | 'all';

interface WeeklyPulseHubProps {
  weeklyCalories: number;
  refreshSignal: number;
}

export const WeeklyPulseHub = memo(function WeeklyPulseHub({
  weeklyCalories,
  refreshSignal,
}: WeeklyPulseHubProps) {
  const [activeTab, setActiveTab] = useState<PulseTab>('body');

  return (
    <div className="space-y-3">
      {/* Segmented Tab Switcher */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex rounded-2xl border border-border-custom/50 bg-surface-solid/50 p-1 text-3xs font-black uppercase tracking-wider backdrop-blur-xs">
          <Pressable
            onClick={() => setActiveTab('body')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'body'
                ? 'bg-primary text-on-accent shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Activity size={12} />
            <span>Ciało</span>
          </Pressable>

          <Pressable
            onClick={() => setActiveTab('nutrition')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'nutrition'
                ? 'bg-primary text-on-accent shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Utensils size={12} />
            <span>Odżywianie</span>
          </Pressable>

          <Pressable
            onClick={() => setActiveTab('discipline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'discipline'
                ? 'bg-primary text-on-accent shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <CheckSquare size={12} />
            <span>Dyscyplina</span>
          </Pressable>

          <Pressable
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-primary text-on-accent shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
            title="Pokaż wszystkie 3 panele"
          >
            <LayoutGrid size={12} />
            <span className="hidden sm:inline">Wszystkie</span>
          </Pressable>
        </div>
      </div>

      {/* Render Active View */}
      {activeTab === 'body' && (
        <div className="animate-fadeIn">
          <WeeklyBodyPulse />
        </div>
      )}

      {activeTab === 'nutrition' && (
        <div className="animate-fadeIn">
          <WeeklyNutritionPulse weeklyCalories={weeklyCalories} refreshSignal={refreshSignal} />
        </div>
      )}

      {activeTab === 'discipline' && (
        <div className="animate-fadeIn">
          <WeeklyWinsMap />
        </div>
      )}

      {activeTab === 'all' && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 animate-fadeIn">
          <WeeklyBodyPulse />
          <WeeklyNutritionPulse weeklyCalories={weeklyCalories} refreshSignal={refreshSignal} />
          <div className="lg:col-span-2">
            <WeeklyWinsMap />
          </div>
        </div>
      )}
    </div>
  );
});
