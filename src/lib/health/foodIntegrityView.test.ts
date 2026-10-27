import { describe, expect, it } from 'vitest';
import { buildIntegrityView, energyFixCalories, sortFindings, type IntegrityFindingRow } from './foodIntegrityView';

const row = (over: Partial<IntegrityFindingRow>): IntegrityFindingRow => ({
  id: 'r1', kind: 'energy_mismatch', severity: 'warn', entityId: 'e1', message: 'm', detail: {}, autoFix: null, ...over,
});

describe('buildIntegrityView', () => {
  it('reads nutrient confidence stored by the weekly audit', () => {
    const view = buildIntegrityView({
      estimatedSharePct: 37,
      nutrients: {
        fiber: { knownKcalSharePct: 62, trust: 'czesciowe', topMissing: [] },
        salt: { knownKcalSharePct: 0, trust: 'niepewne', topMissing: [] },
      },
    });
    expect(view.estimatedSharePct).toBe(37);
    expect(view.nutrients).toEqual([
      { key: 'fiber', label: 'Błonnik', knownKcalSharePct: 62, trust: 'czesciowe' },
      { key: 'salt', label: 'Sól', knownKcalSharePct: 0, trust: 'niepewne' },
    ]);
  });

  it('survives malformed or missing summaries instead of throwing', () => {
    expect(buildIntegrityView(null)).toEqual({ estimatedSharePct: null, nutrients: [] });
    expect(buildIntegrityView({ nutrients: { fiber: { trust: 'wow', knownKcalSharePct: 'x' } } }).nutrients).toEqual([]);
    expect(buildIntegrityView([1, 2]).estimatedSharePct).toBeNull();
  });
});

describe('findings helpers', () => {
  it('puts high severity first', () => {
    const sorted = sortFindings([row({ id: 'a', severity: 'info' }), row({ id: 'b', severity: 'high' }), row({ id: 'c', severity: 'warn' })]);
    expect(sorted.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('offers a kcal fix only for energy mismatches that know the macro energy', () => {
    expect(energyFixCalories(row({ detail: { macroKcal: 400.4 } }))).toBe(400);
    expect(energyFixCalories(row({ detail: {} }))).toBeNull();
    expect(energyFixCalories(row({ kind: 'duplicate_entry', detail: { macroKcal: 400 } }))).toBeNull();
    expect(energyFixCalories(row({ entityId: null, detail: { macroKcal: 400 } }))).toBeNull();
    expect(energyFixCalories(row({ detail: { macroKcal: 0 } }))).toBeNull();
  });
});
