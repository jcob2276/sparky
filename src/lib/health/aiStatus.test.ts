import { describe, expect, it } from 'vitest';
import { aiStatusNotices, type AiStatusRow } from './aiStatus';

const now = Date.parse('2026-11-23T16:00:00Z');
const row = (patch: Partial<AiStatusRow>): AiStatusRow => ({ provider: 'vision', last_ok_at: null, last_error_at: null, last_error_kind: null, ...patch });

describe('aiStatusNotices', () => {
  it('pokazuje aktywny limit zdjęć, dopóki nie było późniejszego sukcesu', () => {
    expect(aiStatusNotices([row({ last_error_at: '2026-11-23T15:00:00Z', last_error_kind: 'quota' })], now)).toEqual([
      'Zdjęcia: darmowy limit analizy wyczerpany, odnowi się rano. Opisz posiłek tekstem.',
    ]);
    expect(aiStatusNotices([row({ last_error_at: '2026-11-23T15:00:00Z', last_error_kind: 'quota', last_ok_at: '2026-11-23T15:30:00Z' })], now)).toEqual([]);
  });

  it('ignoruje stare błędy i pokazuje brak środków dla tekstu', () => {
    expect(aiStatusNotices([row({ last_error_at: '2026-11-22T10:00:00Z', last_error_kind: 'quota' })], now)).toEqual([]);
    expect(aiStatusNotices([row({ provider: 'text', last_error_at: '2026-11-23T14:00:00Z', last_error_kind: 'balance' })], now)[0]).toMatch(/zapasowym modelu/);
  });
});
