import { describe, expect, it, vi } from 'vitest';
import { loadNutritionDashboard } from './nutritionDashboardData';

const api = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('./nutritionDashboardApi', () => ({ fetchNutritionDashboardData: api.fetch }));

const ok = <T,>(data: T) => ({ data, error: null });

describe('loadNutritionDashboard targets', () => {
  it('falls back to the last stored protein floor when today has none', async () => {
    api.fetch.mockResolvedValue({
      targetRes: ok({ target_kcal: 2461, protein_floor_g: null, verdict: null }),
      nutritionRes: ok([]),
      entriesRes: ok([]),
      calibrationRes: ok([]),
      weightsRes: ok([]),
      dayReviews: [],
      proteinFloorRes: ok({ protein_floor_g: 152 }),
    });
    const result = await loadNutritionDashboard('u', '2026-10-19');
    expect(result.kcalTarget).toBe(2461);
    expect(result.proteinGoal).toBe(152);
  });

  it('keeps no goal when none was ever stored', async () => {
    api.fetch.mockResolvedValue({
      targetRes: ok(null), nutritionRes: ok([]), entriesRes: ok([]), calibrationRes: ok([]),
      weightsRes: ok([]), dayReviews: [], proteinFloorRes: ok(null),
    });
    const result = await loadNutritionDashboard('u', '2026-10-19');
    expect(result.proteinGoal).toBeNull();
    expect(result.kcalTarget).toBeNull();
  });
});
