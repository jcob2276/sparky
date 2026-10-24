import { describe, expect, it } from 'vitest';
import { DEFAULT_PROTEIN_FLOOR_G, DEFAULT_SLEEP_TARGET_H, derivePersonalTargets } from '@vanguard/domain';

describe('derivePersonalTargets', () => {
  it('wiersz targets wygrywa, potem waga × g/kg, potem wartość awaryjna', () => {
    expect(derivePersonalTargets({ target: { protein_floor_g: 160, target_kcal: 2800 }, profile: { protein_g_per_kg: 2 }, weightKg: 80 })).toMatchObject({ proteinFloorG: 160, targetKcal: 2800 });
    expect(derivePersonalTargets({ target: null, profile: { protein_g_per_kg: '1.8' }, weightKg: 82.5 }).proteinFloorG).toBe(149);
    expect(derivePersonalTargets({}).proteinFloorG).toBe(DEFAULT_PROTEIN_FLOOR_G);
  });
  it('sen z profilu, a zero lub brak daje wartość awaryjną', () => {
    expect(derivePersonalTargets({ profile: { sleep_target_hours: 7.5 } }).sleepTargetH).toBe(7.5);
    expect(derivePersonalTargets({ profile: { sleep_target_hours: 0 } }).sleepTargetH).toBe(DEFAULT_SLEEP_TARGET_H);
  });
});
