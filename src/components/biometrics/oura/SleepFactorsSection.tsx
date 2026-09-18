import { Utensils, Dumbbell, Flame, Smartphone } from 'lucide-react';
import type { OuraHealthHubData } from './types';

interface SleepFactorsSectionProps {
  context: NonNullable<OuraHealthHubData['nightContext'] | OuraHealthHubData['todayContext']>;
}

export function SleepFactorsSection({ context }: SleepFactorsSectionProps) {
  const meals = context?.meals;
  const lastMealAt = meals?.status === 'available' ? meals.lastAt : null;
  const mealCalories = meals?.status === 'available' ? meals.calories : null;

  const training = context?.training;
  const trainingActive = training?.status === 'available';
  const trainingDuration = trainingActive ? training.durationMinutes : null;
  const trainingStrain = trainingActive ? training.strainScore : null;

  const screen = context?.screen;
  const screenLateMinutes = screen?.status === 'available' ? screen.lateNightMinutes : null;

  const caffeine = context?.caffeine;
  const lastCaffeine = caffeine?.status === 'available' ? caffeine.lastAt : null;

  return (
    <div className="space-y-2.5">
      <h3 className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-18em)] text-text-muted px-1">
        Co realnie wpłynęło na ten sen
      </h3>

      <div className="space-y-2">
        <div className="rounded-2xl border border-border-custom bg-surface-solid/30 p-3.5 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Utensils size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-text-primary">Ostatni posiłek</span>
              <span className={`px-2 py-0.5 rounded-full text-3xs font-black uppercase tracking-wider border ${
                lastMealAt ? 'text-success bg-success/10 border-success/30' : 'text-text-muted bg-surface-solid border-border-custom'
              }`}>
                {lastMealAt ? `o ${lastMealAt}` : 'Brak danych'}
              </span>
            </div>
            <p className="mt-1 text-2xs text-text-secondary leading-relaxed">
              {lastMealAt
                ? `Ostatni posiłek o godz. ${lastMealAt}${mealCalories ? ` (~${mealCalories} kcal)` : ''}. Im wcześniejsza kolacja, tym głębsza regeneracja i niższe tętno spoczynkowe.`
                : 'Brak zalogowanego posiłku wieczornego przed snem.'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border-custom bg-surface-solid/30 p-3.5 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-warning/10 text-warning shrink-0">
            <Dumbbell size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-text-primary">Trening i obciążenie</span>
              <span className={`px-2 py-0.5 rounded-full text-3xs font-black uppercase tracking-wider border ${
                trainingActive ? 'text-warning bg-warning/10 border-warning/30' : 'text-success bg-success/10 border-success/30'
              }`}>
                {trainingActive ? `${trainingDuration} min` : 'Dzień regeneracji'}
              </span>
            </div>
            <p className="mt-1 text-2xs text-text-secondary leading-relaxed">
              {trainingActive
                ? `Zarejestrowano trening: ${trainingDuration} min${trainingStrain != null ? `, obciążenie: ${trainingStrain}` : ''}. Silny bodziec stymuluje wydzielanie hormonu wzrostu w fazie Deep Sleep.`
                : 'Brak ciężkiego wysiłku siłowego przed snem — układ nerwowy nie był przeciążony.'}
            </p>
          </div>
        </div>

        {lastCaffeine && (
          <div className="rounded-2xl border border-border-custom bg-surface-solid/30 p-3.5 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-warning/10 text-warning shrink-0">
              <Flame size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-text-primary">Kofeina</span>
                <span className="text-2xs font-bold text-text-muted">ostatnia o {lastCaffeine}</span>
              </div>
              <p className="mt-1 text-2xs text-text-secondary leading-relaxed">
                Czas półtrwania kofeiny wynosi 5-7h. Kofeina po 14:00 spłyca fazę NREM 3 (sen głęboki).
              </p>
            </div>
          </div>
        )}

        {screenLateMinutes != null && (
          <div className="rounded-2xl border border-border-custom bg-surface-solid/30 p-3.5 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-info/10 text-info shrink-0">
              <Smartphone size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-text-primary">Ekran wieczorem</span>
                <span className="text-2xs font-bold text-text-muted">{screenLateMinutes} min po 21:00</span>
              </div>
              <p className="mt-1 text-2xs text-text-secondary leading-relaxed">
                {screenLateMinutes > 40
                  ? 'Ekspozycja na ekran po 21:00 blokuje naturalną syntezę melatoniny.'
                  : 'Niski czas przed ekranem sprzyja szybszemu wygaszeniu fal mózgowych.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
