import { describe, expect, it } from 'vitest';
import {
  dailySlot,
  daysLeft,
  formatSlot,
  monthEndOf,
  monthStartOf,
  nextMonthStart,
  paceStatus,
  progressPct,
  sortForToday,
  type LearningAssignment,
} from './learningModel';

const book = (patch: Partial<LearningAssignment> = {}): LearningAssignment => ({
  id: 'a', user_id: 'u', month_start: '2026-10-01', link_id: null, skill_id: null,
  title: 'Książka', resource_type: 'book', unit: 'pages', total: 240, done: 0,
  due_date: '2026-10-31', status: 'active', position: 0, completed_at: null,
  created_at: '', updated_at: '', ...patch,
});

describe('daty miesiąca', () => {
  it('początek, koniec i następny miesiąc (też luty i grudzień)', () => {
    expect(monthStartOf('2026-10-21')).toBe('2026-10-01');
    expect(monthEndOf('2026-10-21')).toBe('2026-10-31');
    expect(monthEndOf('2026-02-10')).toBe('2026-02-28');
    expect(monthEndOf('2028-02-10')).toBe('2028-02-29');
    expect(nextMonthStart('2026-10-21')).toBe('2026-11-01');
    expect(nextMonthStart('2026-12-31')).toBe('2027-01-01');
  });
  it('dni do terminu włącznie z dzisiejszym, po terminie zawsze 1', () => {
    expect(daysLeft('2026-10-31', '2026-10-31')).toBe(1);
    expect(daysLeft('2026-10-21', '2026-10-31')).toBe(11);
    expect(daysLeft('2026-11-05', '2026-10-31')).toBe(1);
  });
});

describe('dailySlot', () => {
  it('dzieli to, co zostało, na dni do terminu, w górę', () => {
    const slot = dailySlot(book({ done: 40 }), '2026-10-21');
    // zostało 200, dni 11 -> 19 stron
    expect(slot.amount).toBe(19);
    expect(slot.fromPage).toBe(41);
    expect(slot.toPage).toBe(59);
    expect(slot.remainingAfter).toBe(181);
    expect(slot.minutes).toBe(48);
  });
  it('odhaczony slot nie przesuwa zakresu na dziś', () => {
    const before = dailySlot(book({ done: 40 }), '2026-10-21', 0);
    const after = dailySlot(book({ done: 59 }), '2026-10-21', 19);
    expect(after.fromPage).toBe(before.fromPage);
    expect(after.toPage).toBe(before.toPage);
    expect(after.amount).toBe(before.amount);
  });
  it('zaległość po terminie trafia na dziś w całości', () => {
    const slot = dailySlot(book({ done: 200, due_date: '2026-10-15' }), '2026-10-21');
    expect(slot.overdue).toBe(true);
    expect(slot.amount).toBe(40);
  });
  it('skończone nie daje slotu', () => {
    const slot = dailySlot(book({ done: 240 }), '2026-10-21');
    expect(slot.amount).toBe(0);
    expect(slot.fromPage).toBeNull();
    expect(formatSlot(slot, 'pages')).toBe('Nic na dziś');
  });
  it('ostatniego dnia cały pozostały zakres', () => {
    const slot = dailySlot(book({ done: 220 }), '2026-10-31');
    expect(slot.amount).toBe(20);
    expect(slot.toPage).toBe(240);
  });
});

describe('formatSlot', () => {
  it('formatuje strony, minuty, lekcje i sztuki', () => {
    expect(formatSlot(dailySlot(book({ done: 40 }), '2026-10-21'), 'pages')).toBe('str. 41–59');
    expect(formatSlot(dailySlot(book({ unit: 'minutes', total: 300, due_date: '2026-10-30' }), '2026-10-21'), 'minutes')).toBe('30 min');
    expect(formatSlot(dailySlot(book({ unit: 'lessons', total: 10, due_date: '2026-10-31' }), '2026-10-30'), 'lessons')).toBe('5 lekcje');
    expect(formatSlot(dailySlot(book({ unit: 'items', total: 1, due_date: '2026-10-31' }), '2026-10-31'), 'items')).toBe('1 sztuka');
  });
  it('jedna strona to „str. N”, nie zakres', () => {
    expect(formatSlot(dailySlot(book({ done: 239 }), '2026-10-31'), 'pages')).toBe('str. 240');
  });
});

describe('paceStatus / progressPct', () => {
  it('na początku miesiąca jest zgodnie z planem', () => {
    expect(paceStatus(book(), '2026-10-01')).toBe('on_track');
  });
  it('za planem, gdy brakuje więcej niż jednego dziennego slotu', () => {
    // 20 dni minęło -> oczekiwane ~155 stron, zrobione 40
    expect(paceStatus(book({ done: 40 }), '2026-10-21')).toBe('behind');
  });
  it('przed planem i skończone', () => {
    expect(paceStatus(book({ done: 200 }), '2026-10-10')).toBe('ahead');
    expect(paceStatus(book({ done: 240, status: 'done' }), '2026-10-10')).toBe('done');
  });
  it('jeden słabszy dzień nie robi zaległości', () => {
    expect(paceStatus(book({ done: 70 }), '2026-10-11')).toBe('on_track');
  });
  it('procent postępu jest ograniczony do 0-100', () => {
    expect(progressPct(book({ done: 60 }))).toBe(25);
    expect(progressPct(book({ done: 999 }))).toBe(100);
  });
});

describe('sortForToday', () => {
  it('najpierw za tempem, potem wg pozycji', () => {
    const behind = book({ id: 'b', done: 10, position: 2 });
    const ok = book({ id: 'o', done: 150, position: 0 });
    expect(sortForToday([ok, behind], '2026-10-21', {}).map((a) => a.id)).toEqual(['b', 'o']);
  });
});
