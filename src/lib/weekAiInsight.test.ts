import { describe, expect, it } from 'vitest';
import { describeWeekInsightError } from './weekAiInsight';

describe('describeWeekInsightError', () => {
  it('turns a missing or unreachable function into a plain sentence', () => {
    expect(describeWeekInsightError(new Error('Requested function was not found'))).toContain('nie jest jeszcze dostępna');
    expect(describeWeekInsightError(new Error('Failed to send a request to the Edge Function'))).toContain('nie jest jeszcze dostępna');
  });

  it('passes other messages through and never returns an empty string', () => {
    expect(describeWeekInsightError(new Error('Model zwrócił nieczytelną analizę. Spróbuj ponownie.'))).toBe('Model zwrócił nieczytelną analizę. Spróbuj ponownie.');
    expect(describeWeekInsightError(new Error(''))).toBe('Nie udało się przeanalizować tygodnia.');
  });
});
