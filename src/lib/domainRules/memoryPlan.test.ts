import { describe, expect, it } from 'vitest';
import { planWeekFromMemories, type MemoryMeal, type MemorySlot } from '@vanguard/domain';

const meal = (id: string, slot: MemorySlot, grams: number, per100: { kcal: number; protein: number; carbs: number; fat: number }, confirmedCount = 3): MemoryMeal =>
  ({ id, name: id, slot, confirmedCount, items: [{ name: id, grams, per100 }] });

const base: MemoryMeal[] = [
  meal('owsianka', 'breakfast', 300, { kcal: 150, protein: 8, carbs: 22, fat: 3 }),
  meal('jajka-skyr', 'breakfast', 250, { kcal: 140, protein: 14, carbs: 14, fat: 3 }),
  meal('kurczak-ryz', 'lunch', 450, { kcal: 150, protein: 14, carbs: 18, fat: 2 }),
  meal('makaron', 'lunch', 450, { kcal: 160, protein: 8, carbs: 28, fat: 3 }),
  meal('ryba-ziemniaki', 'dinner', 400, { kcal: 120, protein: 12, carbs: 12, fat: 3 }),
  meal('twarog', 'dinner', 300, { kcal: 100, protein: 14, carbs: 4, fat: 2 }),
  meal('skyr', 'snack', 200, { kcal: 63, protein: 11, carbs: 4, fat: 0.2 }),
];
// Kilka wariantów każdego posiłku o zbliżonych makrach, jak w prawdziwej bazie zatwierdzonych posiłków.
const memories: MemoryMeal[] = base.flatMap((m) => [0, 1, 2].map((v) => ({
  ...m, id: `${m.id}-${v}`, items: m.items.map((i) => ({ ...i, per100: { ...i.per100, kcal: i.per100.kcal * (1 + 0.03 * v) } })),
})));
const target = { kcal: 2250, protein: 170, fat: 50, carbs: 280 };

describe('planWeekFromMemories', () => {
  it('układa 7 dni po jednym posiłku na porę dnia i zbliża się do dziennych kalorii', () => {
    const plan = planWeekFromMemories(target, memories);
    expect(plan).toHaveLength(7);
    for (const day of plan) {
      expect(day.meals.map((m) => m.slot)).toEqual(['breakfast', 'lunch', 'dinner', 'snack']);
      expect(Math.abs(day.kcal - target.kcal) / target.kcal).toBeLessThan(0.35);
    }
  });

  it('powtarza posiłki rzadziej, gdy jest wybór, i daje inne plany dla innego ziarna', () => {
    const plan = planWeekFromMemories(target, memories, 2);
    expect(plan[0].meals[0].memoryId).not.toBe(plan[1].meals[0].memoryId);
    const a = planWeekFromMemories(target, memories, 7, 1).map((d) => d.meals.map((m) => m.memoryId).join());
    const b = planWeekFromMemories(target, memories, 7, 2).map((d) => d.meals.map((m) => m.memoryId).join());
    expect(a).not.toEqual(b);
  });

  it('bez posiłków lub bez celu zwraca pusty plan', () => {
    expect(planWeekFromMemories(target, [])).toEqual([]);
    expect(planWeekFromMemories({ ...target, kcal: 0 }, memories)).toEqual([]);
  });
});
