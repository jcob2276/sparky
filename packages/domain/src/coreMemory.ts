export function readMemoryValue(raw: string | null, now = new Date()) {
  if (!raw?.trim()) return { text: 'Brak wpisu', restorable: false, expired: false, expiresAt: null };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !('text' in value) || typeof value.text !== 'string') {
      return { text: 'Nieczytelny wpis', restorable: false, expired: false, expiresAt: null };
    }
    const expiresAt = 'expires_at' in value && typeof value.expires_at === 'string' ? value.expires_at : null;
    const time = expiresAt ? Date.parse(expiresAt) : NaN;
    const expired = Number.isFinite(time) && time <= now.getTime();
    return { text: value.text, restorable: !!value.text.trim() && Number.isFinite(time) && !expired, expired, expiresAt };
  } catch {
    const malformed = /^[{[]/.test(raw.trim());
    return { text: malformed ? 'Nieczytelny wpis' : raw, restorable: !malformed, expired: false, expiresAt: null };
  }
}
