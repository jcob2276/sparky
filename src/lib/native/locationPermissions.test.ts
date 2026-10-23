import { describe, expect, it } from 'vitest';
import type { NativeLocationStatus } from './locationBufferPlugin';
import { summarizeLocationStatus } from './locationPermissions';

const base: NativeLocationStatus = {
  fine: true,
  coarse: true,
  background: true,
  notifications: true,
  gpsEnabled: true,
  collectorRunning: true,
  mode: 'MOVING',
  pending: 0,
  lastFixAtMs: 1,
  lastFixAccuracy: 8,
  accepted: 1,
  rejected: 0,
  lastReject: '',
};

describe('summarizeLocationStatus', () => {
  it('is ok when everything is granted and collector runs', () => {
    expect(summarizeLocationStatus(base).level).toBe('ok');
  });
  it('asks for foreground first', () => {
    const s = summarizeLocationStatus({ ...base, fine: false, coarse: false });
    expect(s.action).toBe('grant_foreground');
  });
  it('flags approximate-only location', () => {
    const s = summarizeLocationStatus({ ...base, fine: false });
    expect(s.action).toBe('open_app_settings');
  });
  it('flags missing background access', () => {
    expect(summarizeLocationStatus({ ...base, background: false }).action).toBe('grant_background');
  });
  it('flags disabled system GPS before background', () => {
    const s = summarizeLocationStatus({ ...base, gpsEnabled: false, background: false });
    expect(s.action).toBe('open_gps');
  });
});
