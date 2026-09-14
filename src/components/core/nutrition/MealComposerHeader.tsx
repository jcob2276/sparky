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
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-xs font-black uppercase tracking-widest text-text-primary">Posiłek</p>
        <div className="relative flex items-center p-0.5 rounded-full border border-border-custom/60 bg-surface-solid/50">
          {([['Dziś', today], ['Wczoraj', yesterday]] as const).map(([label, date]) => (
            <Pressable
              key={label}
              type="button"
              onClick={() => {
                setPickerOpen(false);
                setLogDate(date);
              }}
              className={`rounded-full px-3 py-1 text-2xs font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
                logDate === date
                  ? 'bg-primary text-on-accent shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {label}
            </Pressable>
          ))}
          <Pressable
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className={`flex items-center justify-center rounded-full px-2.5 py-1 text-2xs font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
              isCustomDate || pickerOpen
                ? 'bg-primary text-on-accent shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
            title="Wybierz inną datę z kalendarza"
          >
            <CalendarDays size={11} className="mr-1 inline-block" />
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
      <div className="grid grid-cols-4 gap-1 p-1 bg-surface-solid/40 rounded-2xl border border-border-custom/50">
        {mealTypes.map((meal) => (
          <Pressable
            key={meal.id}
            type="button"
            onClick={() => setMealType(meal.id as MealTypeId)}
            className={`rounded-xl py-1.5 text-center text-2xs font-black uppercase tracking-wider transition-all duration-150 active:scale-95 ${
              mealType === meal.id
                ? 'bg-surface text-primary shadow-xs font-black'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {meal.label}
          </Pressable>
        ))}
      </div>
    </div>
  );
}
