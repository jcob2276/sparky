import { describe, expect, it } from 'vitest';
import { classifyEvidence, effectDirection, isHigherBetter } from './evidence';

describe('classifyEvidence', () => {
  it('confirmed: n>=30, p<0.001, |rho|>=0.3 (poprawka na ~50 testów)', () => {
    expect(classifyEvidence(30, 0.35, 0.0005)).toBe('confirmed');
    expect(classifyEvidence(60, -0.31, 0.0009)).toBe('confirmed');
  });
  it('pojedynczy wynik p≈0.009 nie jest już „potwierdzony”', () => {
    expect(classifyEvidence(67, 0.32, 0.0094)).toBe('probable');
  });
  it('n<30 albo p>=0.001 obniża do probable', () => {
    expect(classifyEvidence(29, 0.4, 0.0001)).toBe('probable');
    expect(classifyEvidence(30, 0.3, 0.001)).toBe('probable');
  });
  it('probable: n>=15, p<0.01, |rho|>=0.25', () => {
    expect(classifyEvidence(15, 0.4, 0.009)).toBe('probable');
    expect(classifyEvidence(14, 0.4, 0.009)).toBe('tentative');
  });
  it('tentative wymaga istotności p<0.05, a nie samego |rho|', () => {
    expect(classifyEvidence(8, 0.8, 0.02)).toBe('tentative');
    expect(classifyEvidence(20, 0.31, 0.04)).toBe('tentative');
    expect(classifyEvidence(8, 0.3, 0.4)).toBe('insufficient');
    expect(classifyEvidence(20, 0.31, 0.2)).toBe('insufficient');
  });
  it('insufficient: za małe n, za słabe rho, brak rho lub p', () => {
    expect(classifyEvidence(7, 0.9, 0.001)).toBe('insufficient');
    expect(classifyEvidence(7, 0.9, null)).toBe('insufficient');
    expect(classifyEvidence(40, 0.2, 0.0001)).toBe('insufficient');
    expect(classifyEvidence(50, null, null)).toBe('insufficient');
  });
});

describe('effectDirection', () => {
  it('rho>0 przy „wyżej = lepiej” to helps, rho<0 to hurts', () => {
    expect(effectDirection(0.4, true)).toBe('helps');
    expect(effectDirection(-0.4, true)).toBe('hurts');
  });
  it('odwraca kierunek dla wyniku „niżej = lepiej”', () => {
    expect(effectDirection(0.4, false)).toBe('hurts');
    expect(effectDirection(-0.4, false)).toBe('helps');
  });
  it('przy |rho|<0.1 nie rozstrzyga', () => {
    expect(effectDirection(0.05, true)).toBe('unclear');
    expect(effectDirection(null, true)).toBe('unclear');
  });
});

describe('isHigherBetter', () => {
  it('latencja zasypiania to jedyny wynik, który jest lepszy gdy niższy', () => {
    expect(isHigherBetter('sleep_latency_min')).toBe(false);
    expect(isHigherBetter('sleep_score')).toBe(true);
    expect(isHigherBetter('sleep_efficiency')).toBe(true);
  });
});
