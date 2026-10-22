import { describe, expect, it } from 'vitest';
import { effectiveLoadKg } from './bodyweightLoad';

describe('effectiveLoadKg', () => {
  it('doliczą masę ciała do ćwiczeń z własnym ciężarem', () => {
    expect(effectiveLoadKg('Dipy', 5, 80)).toBe(85);
    expect(effectiveLoadKg('Stanie na rękach', 0, 80)).toBe(80);
    expect(effectiveLoadKg('Sumo przysiad', 0, 80)).toBe(56);
  });

  it('nie rusza ćwiczeń z zewnętrznym obciążeniem i działa bez masy ciała', () => {
    expect(effectiveLoadKg('Wyciskanie płaskie', 100, 80)).toBe(100);
    expect(effectiveLoadKg('Dipy', 5, null)).toBe(5);
  });
});
