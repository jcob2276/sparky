import { memo } from 'react';
import WeeklyBodyPulse from './WeeklyBodyPulse';
import WeeklyNutritionPulse from './WeeklyNutritionPulse';
import WeeklyWinsMap from './WeeklyWinsMap';

interface WeeklyPulseHubProps {
  weeklyCalories: number;
  refreshSignal: number;
}

/** Tydzień w pigułce — dni (5/5), jedzenie i sen widoczne od razu, bez klikania. */
export const WeeklyPulseHub = memo(function WeeklyPulseHub({ weeklyCalories, refreshSignal }: WeeklyPulseHubProps) {
  return (
    <div className="space-y-3">
      <WeeklyWinsMap />
      <WeeklyNutritionPulse weeklyCalories={weeklyCalories} refreshSignal={refreshSignal} />
      <WeeklyBodyPulse />
    </div>
  );
});
