import { describe, expect, it } from 'vitest';
import { clampToYearFloor, currentYear, yearFloor } from './yearFloor';

describe('yearFloor', () => {
  it('returns 1 January of the current Warsaw year', () => {
    expect(yearFloor('2026-10-23')).toBe('2026-01-01');
    expect(yearFloor('2027-01-02')).toBe('2027-01-01');
    expect(yearFloor('2026-12-31')).toBe('2026-01-01');
  });

  it('exposes the numeric current year', () => {
    expect(currentYear('2026-03-15')).toBe(2026);
  });

  it('clamps older since-dates up to the floor and keeps newer ones', () => {
    expect(clampToYearFloor('2024-05-01', '2026-10-23')).toBe('2026-01-01');
    expect(clampToYearFloor('2025-12-31', '2026-01-02')).toBe('2026-01-01');
    expect(clampToYearFloor('2026-01-01', '2026-10-23')).toBe('2026-01-01');
    expect(clampToYearFloor('2026-06-30', '2026-10-23')).toBe('2026-06-30');
  });

  it('uses the Warsaw calendar day by default', () => {
    expect(yearFloor()).toMatch(/^\d{4}-01-01$/);
    expect(clampToYearFloor('1999-01-01')).toBe(yearFloor());
  });
});
