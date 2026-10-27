import { describe, expect, it } from 'vitest';
import { auditFoodData, entryUncertaintyPct, parseAmountGrams, type AuditEntry } from '@vanguard/domain';

const entry = (over: Partial<AuditEntry> & { id: string }): AuditEntry => ({
  date: '2026-10-26', name: 'Produkt', amount: '100 g', calories: 200, protein: 10, carbs: 20, fat: 8.9,
  fiber: 2, sugar: 5, saturated_fat: 3, salt: 1, meal_type: 'lunch', meal_group_id: null,
  logged_at: '2026-10-26T12:00:00Z', parse_meta: { macroSource: 'library', uncertainty_pct: 8 }, ...over,
});

const audit = (entries: AuditEntry[], extra: Partial<Parameters<typeof auditFoodData>[0]> = {}) =>
  auditFoodData({ entries, favorites: [], photos: [], dayTotals: [], ...extra });

const kinds = (entries: AuditEntry[], extra = {}) => audit(entries, extra).findings.map((f) => f.kind);

describe('auditFoodData: energy and data integrity', () => {
  it('flags a juice logged as 0 kcal with 100 g of carbs as high severity', () => {
    const { findings } = audit([entry({ id: 'sok', name: 'Sok pomarańczowy', amount: '1000 g', calories: 0, protein: 0, carbs: 100, fat: 0 })]);
    const finding = findings.find((f) => f.kind === 'energy_mismatch');
    expect(finding?.severity).toBe('high');
    expect(finding?.detail).toEqual(expect.objectContaining({ macroKcal: 400, loggedCalories: 0 }));
    expect(finding?.autoFix).toBeNull();
  });

  it('flags kcal equal to grams (skyr 150 g = 150 kcal)', () => {
    expect(kinds([entry({ id: 'skyr', name: 'Skyr', amount: '150 g', calories: 150, protein: 18, carbs: 6.2, fat: 0 })])).toContain('energy_mismatch');
  });

  it('quarantines placeholder favorites automatically, but never rewrites entries', () => {
    const { findings } = audit([], { favorites: [{ id: 'f1', name: 'YoPRO', calories: 100, protein: 8.3, carbs: 5.4, fat: 0.5 }] });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toEqual(expect.objectContaining({ kind: 'placeholder_favorite', autoFix: 'quarantine_favorite', fingerprint: 'placeholder_favorite:f1' }));
  });

  it('detects the same product saved twice within seconds', () => {
    const entries = [
      entry({ id: 'a', name: 'Banan', logged_at: '2026-10-26T10:00:00Z' }),
      entry({ id: 'b', name: 'Banan', logged_at: '2026-10-26T10:00:01Z' }),
      entry({ id: 'c', name: 'Banan', logged_at: '2026-10-26T14:00:00Z' }),
    ];
    const dup = audit(entries).findings.filter((f) => f.kind === 'duplicate_entry');
    expect(dup.map((f) => f.entityId)).toEqual(['b']);
  });

  it('reports photos whose meal was never saved', () => {
    const { findings } = audit([entry({ id: 'e', meal_group_id: 'g1' })], {
      photos: [{ id: 'p1', meal_group_id: 'g1' }, { id: 'p2', meal_group_id: 'g-lost' }],
    });
    expect(findings.filter((f) => f.kind === 'orphan_photo').map((f) => f.entityId)).toEqual(['p2']);
  });

  it('self-heals drifted day totals with a recompute fix', () => {
    const { findings } = audit([entry({ id: 'e', calories: 200 })], { dayTotals: [{ date: '2026-10-26', calories: 150 }] });
    expect(findings.find((f) => f.kind === 'totals_drift')?.autoFix).toBe('recompute_totals');
    expect(kinds([entry({ id: 'e', calories: 200 })], { dayTotals: [{ date: '2026-10-26', calories: 200 }] })).not.toContain('totals_drift');
  });

  it('produces stable fingerprints so a weekly rerun updates instead of duplicating', () => {
    const entries = [entry({ id: 'x', calories: 0, carbs: 50, protein: 0, fat: 0 })];
    const first = audit(entries).findings.map((f) => f.fingerprint);
    expect(audit(entries).findings.map((f) => f.fingerprint)).toEqual(first);
  });
});

describe('auditFoodData: how sure we are about each nutrient', () => {
  it('weights known values by kcal, so a missing fiber on a 800 kcal meal outweighs a 5 kcal item', () => {
    const { summary } = audit([
      entry({ id: 'big', calories: 800, fiber: null }),
      entry({ id: 'small', calories: 200, fiber: 4 }),
    ]);
    expect(summary.nutrients.fiber.knownKcalSharePct).toBe(20);
    expect(summary.nutrients.fiber.trust).toBe('niepewne');
    expect(summary.nutrients.fiber.topMissing[0]).toEqual({ id: 'big', name: 'Produkt', calories: 800 });
    expect(summary.nutrients.sugar.trust).toBe('pewne');
  });

  it('treats a stored zero as known and ignores zero-kcal items', () => {
    const { summary } = audit([
      entry({ id: 'a', calories: 300, saturated_fat: 0 }),
      entry({ id: 'water', name: 'Woda', calories: 0, protein: 0, carbs: 0, fat: 0, saturated_fat: null }),
    ]);
    expect(summary.nutrients.saturated_fat.knownKcalSharePct).toBe(100);
  });

  it('turns every salt gap into one honest finding instead of a fake zero', () => {
    const { findings, summary } = audit([entry({ id: 'a', salt: null }), entry({ id: 'b', salt: null })]);
    const salt = findings.find((f) => f.fingerprint === 'micronutrient_gap:salt');
    expect(summary.nutrients.salt.trust).toBe('niepewne');
    expect(salt?.severity).toBe('warn');
    expect(salt?.message).toContain('dolną granicą');
  });

  it('reports the estimate share and legacy provenance gaps', () => {
    const { summary, findings } = audit([
      entry({ id: 'photo', calories: 600, parse_meta: { macroSource: 'llm_estimate', uncertainty_pct: 25 } }),
      entry({ id: 'legacy', calories: 400, parse_meta: null }),
    ]);
    expect(summary.estimatedSharePct).toBe(60);
    expect(summary.provenanceMissingSharePct).toBe(40);
    expect(findings.map((f) => f.kind)).toEqual(expect.arrayContaining(['estimate_share_high', 'provenance_gap']));
  });
});

describe('helpers', () => {
  it('reads uncertainty with a trust-level fallback', () => {
    expect(entryUncertaintyPct({ uncertainty_pct: 12 })).toBe(12);
    expect(entryUncertaintyPct({ trust_level: 'estimated' })).toBe(25);
    expect(entryUncertaintyPct(null)).toBe(15);
  });

  it('parses grams from stored amounts', () => {
    expect(parseAmountGrams('350 g')).toBe(350);
    expect(parseAmountGrams('2,5 g')).toBe(2.5);
    expect(parseAmountGrams('porcja')).toBeNull();
    expect(parseAmountGrams(null)).toBeNull();
    expect(parseAmountGrams('250 ml')).toBe(250);
    expect(parseAmountGrams('1,5 kg')).toBe(1500);
  });

  it('does not mistake pieces or bare numbers for grams (false "physically impossible" alarms)', () => {
    expect(parseAmountGrams('3 szt.')).toBeNull();
    expect(parseAmountGrams('2 szt')).toBeNull();
    expect(parseAmountGrams('350')).toBeNull();
    const { findings } = audit([entry({ id: 'banany', name: 'Banany (3 szt.)', amount: '3', calories: 315, protein: 3, carbs: 75, fat: 1 })]);
    expect(findings.map((f) => f.kind)).not.toContain('energy_mismatch');
  });
});
