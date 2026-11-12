import { describe, expect, it } from 'vitest';
import { bankTransactionsToCsv } from './bankCsv';

describe('bankTransactionsToCsv', () => {
  it('escapes quotes and neutralises spreadsheet formulas', () => {
    const csv = bankTransactionsToCsv([{ id: '1', account_id: 'a', amount: -12.5, currency: 'PLN', booking_date: '2026-11-03', counterparty_name: '=HYPERLINK("x")', remittance: 'a,b', category: 'zakupy' }]);
    expect(csv).toContain("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csv).toContain('"a,b"');
    expect(csv).toContain('-12.50');
  });
});
