import { describe, expect, it } from 'vitest';
import { bankHealth, needsRenewal } from './bankStatus';

const NOW = Date.parse('2026-11-07T12:00:00Z');
const inDays = (n: number) => new Date(NOW + n * 86_400_000).toISOString();

describe('bankHealth', () => {
  it('brak połączenia', () => {
    expect(bankHealth(null, NOW)).toEqual({ kind: 'none' });
  });

  it('ważna zgoda daleko od końca', () => {
    const health = bankHealth({ status: 'active', valid_until: inDays(90) }, NOW);
    expect(health.kind).toBe('ok');
    expect(needsRenewal(health)).toBe(false);
  });

  it('zgoda bliska końca prosi o odnowienie', () => {
    const health = bankHealth({ status: 'active', valid_until: inDays(10) }, NOW);
    expect(health).toEqual({ kind: 'expiring', daysLeft: 10 });
    expect(needsRenewal(health)).toBe(true);
  });

  it('data w przeszłości oznacza wygaśnięcie mimo statusu active', () => {
    expect(bankHealth({ status: 'active', valid_until: inDays(-1) }, NOW).kind).toBe('expired');
  });

  it('status expired i failed mają pierwszeństwo', () => {
    expect(bankHealth({ status: 'expired', valid_until: inDays(90) }, NOW).kind).toBe('expired');
    expect(bankHealth({ status: 'failed', valid_until: null }, NOW).kind).toBe('failed');
  });

  it('brak daty ważności przy aktywnym połączeniu nie udaje wygaśnięcia', () => {
    expect(bankHealth({ status: 'active', valid_until: null }, NOW)).toEqual({ kind: 'ok', daysLeft: null });
  });
});
