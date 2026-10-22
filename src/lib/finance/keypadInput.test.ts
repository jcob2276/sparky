import { describe, expect, it } from 'vitest';
import { applyKeypadKey, keyFromKeyboard, parseKeypadAmount } from './keypadInput';

describe('applyKeypadKey', () => {
  it('builds an amount digit by digit without leading zeros', () => {
    let value = '';
    for (const key of ['0', '0', '4', '5'] as const) value = applyKeypadKey(value, key);
    expect(value).toBe('45');
  });

  it('allows one comma and at most two decimals', () => {
    let value = '';
    for (const key of ['1', '2', ',', ',', '5', '0', '9'] as const) value = applyKeypadKey(value, key);
    expect(value).toBe('12,50');
    expect(applyKeypadKey('', ',')).toBe('0,');
  });

  it('deletes the last character and caps the integer part', () => {
    expect(applyKeypadKey('12,5', 'back')).toBe('12,');
    expect(applyKeypadKey('', 'back')).toBe('');
    expect(applyKeypadKey('1234567', '8')).toBe('1234567');
  });
});

describe('keypad helpers', () => {
  it('parses Polish decimals and maps keyboard keys', () => {
    expect(parseKeypadAmount('12,50')).toBe(12.5);
    expect(parseKeypadAmount('')).toBe(0);
    expect(keyFromKeyboard({ key: '.' })).toBe(',');
    expect(keyFromKeyboard({ key: 'Backspace' })).toBe('back');
    expect(keyFromKeyboard({ key: 'a' })).toBeNull();
  });
});
