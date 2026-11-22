import { describe, expect, it } from 'vitest';
import { describeRecapError } from './useWeekRecap';

describe('describeRecapError', () => {
  it('mówi po ludzku, gdy funkcji nie ma lub nie ma sieci, i pozwala zamknąć tydzień', () => {
    expect(describeRecapError(new Error('Requested function was not found'))).toContain('nie jest teraz dostępna');
    expect(describeRecapError(new Error('Failed to send a request to the Edge Function'))).toContain('zamknąć tydzień');
  });

  it('inne błędy dostają jeden spokojny komunikat z ponowieniem', () => {
    expect(describeRecapError(new Error('boom'))).toContain('spróbować jeszcze raz');
  });
});
