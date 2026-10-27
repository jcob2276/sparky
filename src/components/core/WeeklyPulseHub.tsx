import { memo } from 'react';
import FoodIntegrityCard from './nutrition/FoodIntegrityCard';
import WeeklyBodyPulse from './WeeklyBodyPulse';
import WeeklyComparePulse from './WeeklyComparePulse';
import WeeklyFatGoalCard from './WeeklyFatGoalCard';
import WeeklyNutritionPulse from './WeeklyNutritionPulse';
import WeeklyPatternCard from './WeeklyPatternCard';
import WeeklySalesPulse from './WeeklySalesPulse';
import WeeklyWinsMap from './WeeklyWinsMap';

interface WeeklyPulseHubProps {
  weeklyCalories: number;
  refreshSignal: number;
}

/** Tydzień w pigułce — dni (5/5), jedzenie, sprzedaż i sen widoczne od razu, bez klikania. */
export const WeeklyPulseHub = memo(function WeeklyPulseHub({ weeklyCalories, refreshSignal }: WeeklyPulseHubProps) {
  return (
    <div className="space-y-3">
      <WeeklyWinsMap />
      <WeeklyComparePulse />
      <WeeklyNutritionPulse weeklyCalories={weeklyCalories} refreshSignal={refreshSignal} />
      <FoodIntegrityCard />
      <WeeklySalesPulse />
      <WeeklyBodyPulse />
      <WeeklyFatGoalCard />
      <WeeklyPatternCard />
    </div>
  );
});
