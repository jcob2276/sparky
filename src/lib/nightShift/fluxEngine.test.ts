import { describe, it, expect } from 'vitest';
import {
  kelvinToRGBMatrix,
  getSVGColorMatrixString,
  calculateFluxIntensity,
  parseTimeToMinutes,
} from './fluxEngine';

describe('fluxEngine', () => {
  it('parses HH:MM into minutes from midnight', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('07:30')).toBe(450);
    expect(parseTimeToMinutes('21:00')).toBe(1260);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });

  it('converts Kelvin to RGB matrix factors accurately', () => {
    // 6500K is neutral (1, 1, 1)
    const k6500 = kelvinToRGBMatrix(6500);
    expect(k6500).toEqual({ r: 1.0, g: 1.0, b: 1.0 });

    // Warm Sunset 2700K reduces blue significantly while keeping red high
    const k2700 = kelvinToRGBMatrix(2700);
    expect(k2700.r).toBe(1.0);
    expect(k2700.g).toBeGreaterThan(0.6);
    expect(k2700.g).toBeLessThan(0.8);
    expect(k2700.b).toBeGreaterThan(0.3);
    expect(k2700.b).toBeLessThan(0.5);

    // Candlelight 1900K attenuates blue further
    const k1900 = kelvinToRGBMatrix(1900);
    expect(k1900.b).toBeLessThan(k2700.b);

    // Pure Red Bio Spectrum 1000K (1.0, 0.0, 0.0)
    const k1000 = kelvinToRGBMatrix(1000);
    expect(k1000).toEqual({ r: 1.0, g: 0.0, b: 0.0 });
  });

  it('formats SVG color matrix string properly', () => {
    const matrix = { r: 1.0, g: 0.8, b: 0.4 };
    const svgMatrix = getSVGColorMatrixString(matrix, 1.0);
    expect(svgMatrix).toContain('1.000 0 0 0 0');
    expect(svgMatrix).toContain('0 0.800 0 0 0');
    expect(svgMatrix).toContain('0 0 0.400 0 0');
  });

  describe('calculateFluxIntensity', () => {
    it('detects active status after 21:00 for schedule 21:00 - 07:00', () => {
      // 21:05
      const d1 = new Date(2026, 6, 27, 21, 5);
      const res1 = calculateFluxIntensity(d1, '21:00', '07:00', 0);
      expect(res1.isActive).toBe(true);
      expect(res1.intensity).toBe(1.0);

      // 03:00 morning
      const d2 = new Date(2026, 6, 28, 3, 0);
      const res2 = calculateFluxIntensity(d2, '21:00', '07:00', 0);
      expect(res2.isActive).toBe(true);
      expect(res2.intensity).toBe(1.0);

      // 14:00 afternoon (inactive)
      const d3 = new Date(2026, 6, 27, 14, 0);
      const res3 = calculateFluxIntensity(d3, '21:00', '07:00', 0);
      expect(res3.isActive).toBe(false);
      expect(res3.intensity).toBe(0.0);
    });

    it('handles gradual ramping 30 minutes before 21:00', () => {
      // 20:45 (15 mins into 30 min pre-ramp) -> 0.5 intensity
      const d = new Date(2026, 6, 27, 20, 45);
      const res = calculateFluxIntensity(d, '21:00', '07:00', 30);
      expect(res.isActive).toBe(true);
      expect(res.intensity).toBeCloseTo(0.5, 1);
    });
  });
});
