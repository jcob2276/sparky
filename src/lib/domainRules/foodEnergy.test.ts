import { describe, expect, it } from 'vitest';
import { assessEnergyConsistency, describeEnergyMismatch, macroEnergyKcal } from '@vanguard/domain';

const food = (calories: number | null, protein: number, carbs: number, fat: number, name?: string) =>
  ({ calories, protein, carbs, fat, name });

describe('energy consistency (per 100 g)', () => {
  it('accepts well-formed foods', () => {
    expect(assessEnergyConsistency(food(89, 1.1, 23, 0.3, 'Banan')).status).toBe('ok');
    expect(assessEnergyConsistency(food(380, 80, 6, 6, 'Odżywka')).status).toBe('ok');
    expect(assessEnergyConsistency(food(388, 4, 93, 0, 'Beza')).status).toBe('ok');
    expect(assessEnergyConsistency(food(900, 0, 0, 100, 'Olej')).status).toBe('ok');
  });

  it('rejects the 100 kcal placeholder seen in saved favorites', () => {
    const skyr = assessEnergyConsistency(food(100, 8.3, 5.4, 0.5, 'YoPRO Straciatella'));
    expect(skyr.status).toBe('mismatch');
    expect(skyr.reason).toBe('kcal_placeholder_100');
    expect(skyr.macroKcal).toBe(59);
    expect(assessEnergyConsistency(food(100, 0.26, 11.4, 0.17, 'Jablko')).status).toBe('mismatch');
    expect(assessEnergyConsistency(food(100, 3.32, 4.8, 2, 'Mleko 2%')).status).toBe('mismatch');
  });

  it('rejects zero kcal with real macros (juice, isotonic drink)', () => {
    const juice = assessEnergyConsistency(food(0, 0, 10, 0, 'Sok 100% Pomarańcza'));
    expect(juice.reason).toBe('kcal_zero_with_macros');
  });

  it('rejects a bread whose kcal ignore its macros', () => {
    expect(assessEnergyConsistency(food(508, 9.9, 52, 6.5, 'chleb biały')).reason).toBe('kcal_differs_from_macros');
  });

  it('rejects physically impossible rows (portion stored as per 100 g)', () => {
    expect(assessEnergyConsistency(food(5000, 30, 800, 200, 'ptasie mleczko')).status).toBe('mismatch');
    expect(assessEnergyConsistency(food(5000, 30, 800, 200)).reason).toBe('kcal_exceeds_fat_limit');
    expect(assessEnergyConsistency(food(300, 30, 80, 20)).reason).toBe('macros_exceed_portion');
  });

  it('does not judge items it cannot compare', () => {
    expect(assessEnergyConsistency(food(0, 0, 0, 0, 'Woda')).status).toBe('unknown');
    expect(assessEnergyConsistency(food(2, 0.1, 0, 0, 'Kawa czarna')).status).toBe('unknown');
    expect(assessEnergyConsistency(food(null, 5, 10, 2)).status).toBe('unknown');
  });

  it('lets alcohol exceed its macros but not undershoot them', () => {
    expect(assessEnergyConsistency(food(43, 0.5, 3.6, 0, 'Piwo jasne')).status).toBe('ok');
    expect(assessEnergyConsistency(food(250, 0, 0.5, 0, 'Wódka 40%')).status).toBe('unknown');
    expect(assessEnergyConsistency(food(60, 0, 6, 0, 'Cydr jabłkowy')).status).toBe('ok');
    expect(assessEnergyConsistency(food(60, 0, 6, 0, 'Sok jabłkowy')).status).toBe('mismatch');
  });
});

describe('energy consistency (per portion)', () => {
  it('flags kcal equal to grams in a logged portion', () => {
    const entry = assessEnergyConsistency(food(150, 18, 6.2, 0, 'Skyr naturalny'), 150);
    expect(entry.status).toBe('mismatch');
    expect(entry.macroKcal).toBe(97);
  });

  it('scales the tolerance with the portion', () => {
    expect(assessEnergyConsistency(food(450, 40, 25, 20), 250).status).toBe('ok');
  });

  it('describes the problem with both numbers', () => {
    const check = assessEnergyConsistency(food(0, 0, 100, 0, 'Sok'), 1000);
    expect(describeEnergyMismatch(check, 0)).toBe('0 kcal przy niezerowych makro: 0 kcal vs 400 z makro');
  });

  it('computes Atwater energy', () => {
    expect(macroEnergyKcal({ protein: 10, carbs: 10, fat: 10 })).toBe(170);
    expect(macroEnergyKcal({ protein: null, carbs: undefined, fat: 1 })).toBe(9);
  });
});
