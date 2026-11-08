import { describe, expect, it } from 'vitest';
import {
  HISTORY_DAYS,
  HISTORY_EMPTY_WINDOWS_TO_STOP,
  HISTORY_WINDOW_DAYS,
  historyCursor,
  historyFloor,
  isHistoryExhausted,
  nextHistoryWindow,
} from '@vanguard/domain';

const TODAY = '2026-11-08';
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

describe('bankHistory', () => {
  it('kursor startuje od najwcześniejszej znanej granicy', () => {
    expect(historyCursor({ historyCursor: null, transactionsFrom: null, oldestStored: '2026-08-10' }, TODAY, 90)).toBe('2026-08-10');
    expect(historyCursor({ historyCursor: '2026-05-12', transactionsFrom: '2026-08-10', oldestStored: '2026-08-10' }, TODAY, 90)).toBe('2026-05-12');
    expect(historyCursor({ historyCursor: null, transactionsFrom: '2026-08-01', oldestStored: '2026-08-10' }, TODAY, 90)).toBe('2026-08-01');
  });

  it('bez żadnych danych zaczyna od końca okna ostatnich dni', () => {
    expect(historyCursor({ historyCursor: null, transactionsFrom: null, oldestStored: null }, TODAY, 90)).toBe('2026-08-10');
  });

  it('okno cofa się o stałą liczbę dni i kończy na kursorze', () => {
    const w = nextHistoryWindow('2026-08-10', historyFloor(TODAY));
    expect(w).toEqual({ from: '2026-05-12', to: '2026-08-10' });
    expect(daysBetween(w!.from, w!.to)).toBe(HISTORY_WINDOW_DAYS);
  });

  it('ostatnie okno jest przycięte do dna, a poniżej dna nie ma okna', () => {
    const floor = historyFloor(TODAY);
    expect(floor).toBe('2023-01-08');
    const last = nextHistoryWindow('2023-02-15', floor);
    expect(last).toEqual({ from: floor, to: '2023-02-15' });
    expect(nextHistoryWindow(floor, floor)).toBeNull();
    expect(nextHistoryWindow('2022-01-01', floor)).toBeNull();
  });

  it('okna pokrywają cały zakres bez dziur i zachodzą na siebie o dzień', () => {
    const floor = historyFloor(TODAY);
    let cursor = '2026-08-10';
    const windows = [];
    for (let guard = 0; guard < 100; guard++) {
      const w = nextHistoryWindow(cursor, floor);
      if (!w) break;
      windows.push(w);
      expect(w.to).toBe(cursor); // brak dziur: kolejne okno zaczyna dokładnie tam, gdzie skończyło się poprzednie
      cursor = w.from;
    }
    expect(cursor).toBe(floor);
    expect(windows.length).toBe(Math.ceil(daysBetween(floor, '2026-08-10') / HISTORY_WINDOW_DAYS));
    expect(daysBetween(floor, TODAY)).toBe(HISTORY_DAYS);
  });

  it('wyczerpanie: kursor daleko za najstarszą transakcją oznacza brak starszych danych', () => {
    const gap = HISTORY_EMPTY_WINDOWS_TO_STOP * HISTORY_WINDOW_DAYS;
    expect(isHistoryExhausted('2024-01-01', '2026-08-10')).toBe(true);
    expect(isHistoryExhausted('2026-08-09', '2026-08-10')).toBe(false);
    expect(isHistoryExhausted(`2025-08-15`, '2026-08-10')).toBe(daysBetween('2025-08-15', '2026-08-10') >= gap);
  });

  it('bez żadnej zapisanej transakcji nigdy nie uznaje historii za wyczerpaną', () => {
    expect(isHistoryExhausted('2023-01-01', null)).toBe(false);
  });
});
