import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchNutritionTargetForDay } from './nutritionTargetsApi';
import { fetchNutritionDayContext } from './nutritionContext';
import { fetchNutritionDashboardData } from './nutritionDashboardApi';

const db = vi.hoisted(() => ({
  targets: [] as Record<string, unknown>[], error: null as { message: string } | null,
}));
vi.mock('./nutritionTrackerApi', () => ({ fetchNutritionDayReviews: async () => [] }));
vi.mock('../supabase', () => ({ invokeEdge: vi.fn(), supabase: { from: (table: string) => {
  let rows = table === 'nutrition_targets' ? [...db.targets] : [];
  let columns = '*';
  const project = (row: Record<string, unknown>) => columns === '*' ? row : Object.fromEntries(
    columns.split(',').map(column => [column.trim(), row[column.trim()] ?? null]),
  );
  const response = (single = false) => ({
    data: single ? rows[0] ? project(rows[0]) : null : rows.map(project),
    error: table === 'nutrition_targets' ? db.error : null,
  });
  const filter = (column: string, accepts: (value: unknown) => boolean) => {
    rows = rows.filter(row => accepts(row[column])); return query;
  };
  const query = {
    select: (value: string) => { columns = value; return query; },
    eq: (column: string, value: unknown) => filter(column, entry => entry === value),
    lte: (column: string, value: string) => filter(column, entry => String(entry) <= value),
    gte: (column: string, value: string) => filter(column, entry => String(entry) >= value),
    not: (column: string) => filter(column, entry => entry != null),
    order: (column: string, options?: { ascending?: boolean }) => {
      rows.sort((a, b) => String(a[column]).localeCompare(String(b[column])) * (options?.ascending === false ? -1 : 1));
      return query;
    },
    limit: (count: number) => { rows = rows.slice(0, count); return query; },
    maybeSingle: async () => response(true),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(response()).then(resolve),
  };
  return query;
} } }));

const day = '2026-10-24';
const target = (date: string, kcal: number, protein: number | null = 155, userId = 'owner') => ({
  user_id: userId, date, target_kcal: kcal, protein_floor_g: protein,
  forecast_30d_weight_kg: 80, forecast_90d_weight_kg: 75, forecast_90d_bf_pct: 14,
  days_to_goal_est: 60, verdict: { trajectory: 'on_track', forecast_note: 'only for this date' },
  updated_at: `${date}T10:00:00Z`,
});
const dashboard = () => fetchNutritionDashboardData({ userId: 'owner', today: day, since: day, calibrationSince: day });

beforeEach(() => { db.targets = []; db.error = null; });

describe('effective nutrition target across readers', () => {
  it.each(['past', 'exact'] as const)('uses the latest eligible row (%s), ignoring future dates and other owners', async kind => {
    db.targets = [target('2026-10-22', 2200), target('2026-10-23', 2400),
      target('2026-10-25', 3000), target(day, 9999, 999, 'other')];
    if (kind === 'exact') db.targets.push(target(day, 2500, 160));
    const expected = kind === 'exact' ? { target_kcal: 2500, protein_floor_g: 160 } : { target_kcal: 2400, protein_floor_g: 155 };
    const [canonical, context, dash] = await Promise.all([
      fetchNutritionTargetForDay('owner', day), fetchNutritionDayContext('owner', day), dashboard(),
    ]);
    expect(canonical).toMatchObject(expected);
    expect.soft(context).toMatchObject({ targetKcal: expected.target_kcal, targetProtein: expected.protein_floor_g });
    expect.soft(dash.targetRes.data).toMatchObject(expected);
    if (kind === 'past') {
      expect(context.forecastWeight90d).toBeNull();
      expect(context.forecastBf90d).toBeNull();
      expect(context.daysToGoalEst).toBeNull();
      expect(context.trajectory).toBeNull();
      expect(dash.targetRes.data?.forecast_90d_weight_kg ?? null).toBeNull();
      expect(dash.targetRes.data?.verdict ?? null).toBeNull();
    } else {
      expect(context.forecastWeight90d).toBe(75);
      expect(context.trajectory).toBe('on_track');
      expect(dash.targetRes.data?.forecast_90d_weight_kg).toBe(75);
    }
  });

  it('does not fill a null field in the effective row from an older target', async () => {
    db.targets = [target('2026-10-23', 2400), target(day, 2500, null)];
    const [canonical, context, dash] = await Promise.all([
      fetchNutritionTargetForDay('owner', day), fetchNutritionDayContext('owner', day), dashboard(),
    ]);
    expect(canonical?.protein_floor_g).toBeNull();
    expect(context.targetProtein).toBeNull();
    expect(dash.targetRes.data?.protein_floor_g).toBeNull();
    expect(dash.proteinFloorRes.data?.protein_floor_g).toBeNull();
  });

  it('returns no target when only future rows exist', async () => {
    db.targets = [target('2026-10-25', 3000)];
    expect(await fetchNutritionTargetForDay('owner', day)).toBeNull();
    expect(await fetchNutritionDayContext('owner', day)).toMatchObject({ targetKcal: null, targetProtein: null });
    expect((await dashboard()).targetRes.data).toBeNull();
    expect((await dashboard()).proteinFloorRes.data).toBeNull();
  });

  it('propagates target read errors instead of pretending no target exists', async () => {
    db.error = { message: 'target read failed' };
    await expect(fetchNutritionTargetForDay('owner', day)).rejects.toEqual(db.error);
    await expect(fetchNutritionDayContext('owner', day)).rejects.toEqual(db.error);
    await expect(dashboard()).rejects.toEqual(db.error);
  });
});
