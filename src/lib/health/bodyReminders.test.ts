import { describe, expect, it } from 'vitest';
import { bodyReminders, nextDueDate, type BodyReminderRow } from './bodyReminders';

const row = (date: string, patch: Partial<BodyReminderRow> = {}): BodyReminderRow => ({
  date, weight: null, waist: null, neck: null, chest: null, belly: null, hips: null, thigh: null, biceps_l: null, calf: null, ...patch,
});

describe('bodyReminders', () => {
  it('waga: do 2 dni jest w porządku, w dniu interwału to przypomnienie, po nim obowiązek', () => {
    const rows = [row('2026-10-21', { weight: 77.5 })];
    const at = (today: string) => bodyReminders(rows, today)[0];
    expect(at('2026-10-23').state).toBe('ok');
    expect(at('2026-10-24').state).toBe('due');
    expect(at('2026-10-25').state).toBe('overdue');
    expect(at('2026-10-25').ageDays).toBe(4);
  });

  it('pozostałe pomiary liczą się od 21 dni, a sama talia z wagą ich nie odnawia', () => {
    const rows = [row('2026-10-21', { weight: 77.5, waist: 87 }), row('2026-10-01', { belly: 88, chest: 113 })];
    const tape = (today: string) => bodyReminders(rows, today)[1];
    expect(tape('2026-10-21').state).toBe('ok');
    expect(tape('2026-10-22').state).toBe('due');
    expect(tape('2026-10-23').state).toBe('overdue');
    expect(tape('2026-10-23').lastDate).toBe('2026-10-01');
  });

  it('brak jakiegokolwiek pomiaru to obowiązek, a termin liczy się od ostatniego wpisu', () => {
    const [weight, tape] = bodyReminders([], '2026-10-24');
    expect(weight.state).toBe('overdue');
    expect(tape.state).toBe('overdue');
    expect(nextDueDate(weight)).toBeNull();
    expect(nextDueDate(bodyReminders([row('2026-10-21', { weight: 77 })], '2026-10-24')[0])).toBe('2026-10-24');
  });
});
