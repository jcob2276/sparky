import { describe, expect, it } from 'vitest';
import { pickUsdaMatch, scoreUsdaCandidate, type UsdaCandidate } from '@vanguard/domain';

const c = (fdcId: number, description: string, dataType: UsdaCandidate['dataType'] = 'sr_legacy_food'): UsdaCandidate => ({ fdcId, description, dataType });

describe('scoreUsdaCandidate', () => {
  it('rodzaj musi się zgadzać: oliwa to „Oil, olive”, nie sardele w oliwie', () => {
    expect(scoreUsdaCandidate('Oil, olive', 'Anchovies, canned in olive oil, with salt, drained')).toBeNull();
    expect(scoreUsdaCandidate('Oil, olive', 'Oil, olive, salad or cooking')?.score).toBeGreaterThan(0.8);
  });

  it('stan z zapytania jest warunkiem: gotowany ryż nie dopasuje się do surowego', () => {
    expect(scoreUsdaCandidate('Rice, white, cooked', 'Rice, white, long-grain, regular, raw, enriched')).toBeNull();
    expect(scoreUsdaCandidate('Rice, white, cooked', 'Rice, white, long-grain, regular, enriched, cooked')?.score).toBeGreaterThan(0.7);
  });

  it('nieoczekiwany stan w opisie obniża wynik, ale nie odrzuca', () => {
    const withoutState = scoreUsdaCandidate('Banana', 'Bananas, raw');
    const exact = scoreUsdaCandidate('Banana, raw', 'Bananas, raw');
    expect(withoutState).not.toBeNull();
    expect(exact!.score).toBeGreaterThan(withoutState!.score);
  });
});

describe('pickUsdaMatch', () => {
  const candidates = [
    c(1, 'Turkey, whole, breast, meat only, cooked, roasted'),
    c(2, 'Chicken, broilers or fryers, breast, meat only, cooked, roasted'),
    c(3, 'Chicken, broilers or fryers, breast, meat only, raw'),
    c(4, 'Fast Foods, Fried Chicken, Breast, meat only, skin and breading removed'),
  ];

  it('wybiera pierś z kurczaka pieczoną, nie indyka ani surową', () => {
    const match = pickUsdaMatch('Chicken, breast, meat only, cooked, roasted', candidates);
    expect(match?.candidate.fdcId).toBe(2);
  });

  it('zwraca null, gdy nic nie pasuje pewnie (lepszy brak dopasowania niż fałszywa precyzja)', () => {
    expect(pickUsdaMatch('Pierogi, ruskie', candidates)).toBeNull();
  });

  it('przy remisie woli Foundation od SR Legacy', () => {
    const tie = [c(10, 'Tomatoes, grape, raw'), c(11, 'Tomatoes, grape, raw', 'foundation_food')];
    expect(pickUsdaMatch('Tomatoes, grape, raw', tie)?.candidate.fdcId).toBe(11);
  });
});
