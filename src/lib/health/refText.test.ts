import { describe, expect, it } from 'vitest';
import { isNumericRefText, localizeRefText } from './refText';

describe('localizeRefText', () => {
  it('translates English lab reference notes to Polish', () => {
    expect(localizeRefText('Targets depend on cardiovascular risk; lab notes <130 mg/dL for low/moderate risk.'))
      .toBe('Cel zależy od ryzyka sercowo-naczyniowego; laboratorium podaje <130 mg/dL przy niskim lub umiarkowanym ryzyku.');
    expect(localizeRefText('<100 fasting / <125 non-fasting')).toBe('<100 na czczo / <125 nie na czczo');
    expect(localizeRefText('Sufficient 30-100; deficiency <10; insufficient 10-30; toxicity >100'))
      .toBe('wystarczający 30-100; niedobór <10; niewystarczający 10-30; toksyczny >100');
  });

  it('keeps numeric ranges and empty values untouched', () => {
    expect(localizeRefText('4.0-10.0')).toBe('4.0-10.0');
    expect(localizeRefText(null)).toBeNull();
  });

  it('recognises purely numeric ranges for monospace rendering', () => {
    expect(isNumericRefText('4.0-10.0')).toBe(true);
    expect(isNumericRefText('>40')).toBe(true);
    expect(isNumericRefText('Cel zależy od ryzyka')).toBe(false);
  });
});
