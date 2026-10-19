import { describe, expect, it } from 'vitest';
import { readMemoryValue } from './coreMemoryHistory';

describe('core memory history value', () => {
  it('preserves original expiry and refuses malformed or expired envelopes for restoration', () => {
    const now = new Date('2026-10-19T12:00:00Z');
    expect(readMemoryValue('{"text":"Cel","expires_at":"2026-10-18T12:00:00Z"}', now))
      .toMatchObject({ text: 'Cel', restorable: false, expired: true });
    expect(readMemoryValue('{"text":"Cel","expires_at":"invalid"}', now).restorable).toBe(false);
    expect(readMemoryValue('{"text":17}', now).restorable).toBe(false);
    expect(readMemoryValue(null, now).restorable).toBe(false);
  });

  it('reads legacy text and valid future envelopes without extending their lifetime', () => {
    const now = new Date('2026-10-19T12:00:00Z');
    expect(readMemoryValue('Dawna deklaracja', now)).toMatchObject({ text: 'Dawna deklaracja', restorable: true });
    expect(readMemoryValue('{"text":"Cel","expires_at":"2026-10-20T12:00:00Z"}', now))
      .toMatchObject({ text: 'Cel', restorable: true, expiresAt: '2026-10-20T12:00:00Z' });
  });
});
