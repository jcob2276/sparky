import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { planWeekFromMemories, type DayTarget, type MemorySlot, type PlannedDay } from '@vanguard/domain';
import Button from '../../ui/Button';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';
import { formatDecimalPl } from '../../../lib/formatPl';
import { fetchMealMemories } from '../../../lib/health/mealMemoryApi';

const SLOT_LABEL: Record<MemorySlot, string> = { breakfast: 'Śniadanie', lunch: 'Obiad', dinner: 'Kolacja', snack: 'Przekąska' };

function dayLabel(offset: number): string {
  if (offset === 0) return 'Dziś';
  if (offset === 1) return 'Jutro';
  return new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(`${shiftDateStr(getTodayWarsaw(), offset)}T12:00:00`));
}

function Day({ day, offset }: { day: PlannedDay; offset: number }) {
  return (
    <li className="space-y-2 rounded-lg border border-border-custom p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold capitalize text-text-primary">{dayLabel(offset)}</p>
        <p className="text-2xs tabular-nums text-text-secondary">
          {day.kcal} kcal · B {formatDecimalPl(day.protein)} · T {formatDecimalPl(day.fat)} · W {formatDecimalPl(day.carbs)}
        </p>
      </div>
      <ul className="list-none space-y-1 p-0">
        {day.meals.map((meal) => (
          <li key={meal.slot} className="text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">{SLOT_LABEL[meal.slot]}:</span>{' '}
            {meal.items.map((i) => `${i.name} ${i.grams} g`).join(', ')} <span className="tabular-nums text-text-muted">({meal.kcal} kcal)</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

interface Props { userId: string; target: DayTarget; onAiPlan: () => void }

/** Plan tygodnia z Twoich zatwierdzonych posiłków: natychmiast, bez AI i bez limitów. */
export default function MemoryWeekPlan({ userId, target, onAiPlan }: Props) {
  const [seed, setSeed] = useState(0);
  const { data: memories, isLoading } = useQuery({ queryKey: ['meal-memories', userId], queryFn: () => fetchMealMemories(userId) });
  const { kcal, protein, fat, carbs } = target;
  const plan = useMemo(() => planWeekFromMemories({ kcal, protein, fat, carbs }, memories ?? [], 7, seed), [memories, kcal, protein, fat, carbs, seed]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">Układam z posiłków, które już zatwierdziłeś, pod cel {kcal} kcal, {protein} g białka{fat != null ? `, do ${fat} g tłuszczu` : ''}.</p>
      {isLoading && <p role="status" className="text-xs text-text-muted">Wczytuję Twoje posiłki…</p>}
      {!isLoading && plan.length === 0 && <p className="text-sm text-text-muted">Za mało zatwierdzonych posiłków, żeby ułożyć plan. Zapisuj posiłki z pewnymi makrami, a pojawią się tutaj.</p>}
      <ul className="list-none space-y-2 p-0">{plan.map((day, offset) => <Day key={offset} day={day} offset={offset} />)}</ul>
      <div className="flex gap-2">
        <Button size="sm" variant="tonal" onClick={() => setSeed((s) => s + 1)}>Przelosuj</Button>
        <Button size="sm" variant="ghost" onClick={onAiPlan}>Nowe propozycje z AI</Button>
      </div>
    </div>
  );
}
