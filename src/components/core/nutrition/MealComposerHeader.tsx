import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import type { MealTypeId } from '../../../lib/health/foodLogging';
import { Pressable } from '../../ui/ControlPrimitives';
import { formatShortDateWarsaw } from '../../../lib/date';
import MealDatePickerPopover from './MealDatePickerPopover';

export function ComposerHeader({
  logDate, setLogDate, mealType, setMealType, today, yesterday, mealTypes,
}: {
  logDate: string;
  setLogDate: (value: string) => void;
  mealType: MealTypeId;
  setMealType: (value: MealTypeId) => void;
  today: string;
  yesterday: string;
  mealTypes: ReadonlyArray<{ id: string; label: string }>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isCustomDate = logDate !== today && logDate !== yesterday;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-base font-black tracking-tight text-text-primary">Posiłek</p>
        <div role="group" aria-label="Dzień" className="meal-segment relative flex items-center">
          {([['Dziś', today], ['Wczoraj', yesterday]] as const).map(([label, date]) => (
            <Pressable
              key={label}
              aria-pressed={logDate === date}
              onClick={() => {
                setPickerOpen(false);
                setLogDate(date);
              }}
              className="meal-segment-item meal-hit px-3 text-xs"
            >
              {label}
            </Pressable>
          ))}
          <Pressable
            aria-pressed={isCustomDate || pickerOpen}
            aria-label="Wybierz inną datę z kalendarza"
            onClick={() => setPickerOpen((v) => !v)}
            className="meal-segment-item meal-hit gap-1 px-2.5 text-xs"
            title="Wybierz inną datę z kalendarza"
          >
            <CalendarDays size={13} aria-hidden="true" />
            <span>{isCustomDate ? formatShortDateWarsaw(logDate) : 'Inna'}</span>
          </Pressable>

          {pickerOpen && (
            <MealDatePickerPopover
              logDate={logDate}
              today={today}
              yesterday={yesterday}
              onSelectDate={(newDate) => setLogDate(newDate)}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      </div>
      <div role="group" aria-label="Typ posiłku" className="meal-segment meal-segment-wide grid grid-cols-4">
        {mealTypes.map((meal) => (
          <Pressable
            key={meal.id}
            aria-pressed={mealType === meal.id}
            onClick={() => setMealType(meal.id as MealTypeId)}
            className="meal-segment-item meal-hit text-xs"
          >
            {meal.label}
          </Pressable>
        ))}
      </div>
    </div>
  );
}
