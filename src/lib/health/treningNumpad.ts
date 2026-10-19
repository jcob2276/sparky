/** Pure helpers for Strive-style workout numpad entry. */

export type TreningNumpadField = 'kg' | 'reps' | 'rir';

const NUMPAD_FIELD_ORDER: TreningNumpadField[] = ['kg', 'reps', 'rir'];

export function nextNumpadField(field: TreningNumpadField): TreningNumpadField | null {
  const i = NUMPAD_FIELD_ORDER.indexOf(field);
  if (i < 0 || i >= NUMPAD_FIELD_ORDER.length - 1) return null;
  return NUMPAD_FIELD_ORDER[i + 1];
}

export function clampNumpadValue(raw: string, opts: { max?: number; integer?: boolean }): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return '';
  const capped = Math.min(opts.max ?? Infinity, Math.max(0, n));
  if (opts.integer) return String(Math.round(capped));
  return String(Math.round(capped * 100) / 100);
}

export function nudgeNumpadValue(
  current: string,
  direction: 1 | -1,
  step: number,
  opts: { max?: number; integer?: boolean; placeholder?: string } = {},
): string {
  const base = parseFloat(current || opts.placeholder || '0');
  const start = Number.isFinite(base) ? base : 0;
  const next = Math.round((start + direction * step) * 100) / 100;
  return clampNumpadValue(String(Math.max(0, next)), opts);
}

/** First key after focus replaces; further keys append. Decimal ignored on integer fields. */
export function applyNumpadKey(
  current: string,
  key: string,
  opts: { fresh: boolean; integer?: boolean; max?: number },
): { value: string; fresh: boolean } {
  if (key === 'backspace') {
    return { value: current.slice(0, -1), fresh: false };
  }
  if (key === '.') {
    if (opts.integer) return { value: current, fresh: opts.fresh };
    if (opts.fresh || !current) return { value: '0.', fresh: false };
    if (current.includes('.')) return { value: current, fresh: false };
    return { value: `${current}.`, fresh: false };
  }
  if (!/^\d$/.test(key)) return { value: current, fresh: opts.fresh };

  let next: string;
  if (opts.fresh || current === '0') {
    next = key;
  } else {
    next = `${current}${key}`;
  }
  // Soft length guard (kg rarely > 4 digits + decimal)
  if (next.replace('.', '').length > 6) return { value: current, fresh: false };

  if (opts.max != null) {
    const n = Number(next);
    if (Number.isFinite(n) && n > opts.max) {
      return { value: clampNumpadValue(next, opts), fresh: false };
    }
  }
  return { value: next, fresh: false };
}
