export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | ',' | 'back';

const MAX_INTEGER_DIGITS = 7;
const MAX_DECIMALS = 2;

/** Edycja kwoty z klawiatury ekranowej: jedno przecinek, do 2 miejsc po przecinku, bez wiodących zer. */
export function applyKeypadKey(amount: string, key: KeypadKey): string {
  if (key === 'back') return amount.slice(0, -1);
  if (key === ',') {
    if (amount.includes(',')) return amount;
    return amount === '' ? '0,' : `${amount},`;
  }
  const [integer, decimals] = amount.split(',');
  if (decimals !== undefined) {
    return decimals.length >= MAX_DECIMALS ? amount : `${amount}${key}`;
  }
  if (integer === '0') return key === '0' ? amount : key;
  if (integer.length >= MAX_INTEGER_DIGITS) return amount;
  return `${amount}${key}`;
}

export function parseKeypadAmount(amount: string): number {
  const value = Number(amount.replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

export function keyFromKeyboard(event: { key: string }): KeypadKey | null {
  if (/^[0-9]$/.test(event.key)) return event.key as KeypadKey;
  if (event.key === ',' || event.key === '.') return ',';
  if (event.key === 'Backspace') return 'back';
  return null;
}
