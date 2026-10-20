import { describe, expect, it } from 'vitest';
import { effectHeadline, top5Headline } from './headline';
import type { SplitComparison } from './types';

const split = (lowMean: number, highMean: number): SplitComparison => ({
  thresholdLabel: 'Trening 3 h przed snem',
  lowLabel: 'mniej niż 3 h przed snem',
  highLabel: '3 h lub więcej przed snem',
  lowN: 7,
  highN: 10,
  lowMean,
  highMean,
  delta: Math.round((highMean - lowMean) * 10) / 10,
});

describe('effectHeadline', () => {
  it('opisuje gorszą grupę z liczbą i jednostką', () => {
    expect(effectHeadline('training_gap_h', 'deep_sleep_pct', 'probable', 0.42, split(17, 21)))
      .toBe('Trening kończony mniej niż 3 h przed snem: sen głęboki −4 pp.');
  });

  it('latencja: gorsza grupa ma wyższą wartość (plus)', () => {
    expect(effectHeadline('training_gap_h', 'sleep_latency_min', 'probable', -0.4, split(20, 12)))
      .toBe('Trening kończony mniej niż 3 h przed snem: czas zasypiania +8 min.');
  });

  it('tentative dostaje uczciwy dopisek', () => {
    expect(effectHeadline('training_gap_h', 'sleep_score', 'tentative', 0.35, split(70, 75)))
      .toBe('Trening kończony mniej niż 3 h przed snem: wynik snu −5 pkt. Wstępnie, za mało nocy.');
  });

  it('bez splitu albo przy sprzecznym splicie opiera się na kierunku korelacji', () => {
    expect(effectHeadline('phone_evening_min', 'sleep_score', 'tentative', -0.31, null))
      .toBe('Telefon po 21:30, wyższa wartość: wynik snu spada. Wstępnie, za mało nocy.');
    expect(effectHeadline('phone_evening_min', 'sleep_score', 'probable', 0.4, split(80, 70)))
      .toBe('Telefon po 21:30, wyższa wartość: wynik snu rośnie.');
  });
});

describe('top5Headline', () => {
  it('sen krótki => mniej Top 5', () => {
    const s: SplitComparison = { ...split(38, 61), lowLabel: 'poniżej 7 h', highLabel: '7 h lub więcej' };
    expect(top5Headline('sleep_h', 'confirmed', 0.28, s)).toBe('Po śnie poniżej 7 h robisz o 23 pp mniej z Top 5.');
  });
});
