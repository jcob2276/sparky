import { beforeEach, describe, expect, it, vi } from 'vitest';

const drain = vi.fn();
const ack = vi.fn();
const upsert = vi.fn();

vi.mock('./platform', () => ({ isAndroid: () => true, isNativePlatform: () => true }));
vi.mock('./locationBufferPlugin', () => ({
  LocationBuffer: { drain: (o: unknown) => drain(o), ack: (o: unknown) => ack(o) },
}));
vi.mock('../locationHistoryApi', () => ({
  upsertLocationPoints: (rows: unknown) => upsert(rows),
}));

import { bufferedPointToRow, flushLocationQueue } from './locationQueueFlush';

const point = (id: number) => ({ id, ts: 1_700_000_000_000 + id, kind: 'point' as const, lat: 50, lng: 21, accuracy: 9 });

describe('flushLocationQueue', () => {
  beforeEach(() => {
    drain.mockReset();
    ack.mockReset();
    upsert.mockReset();
  });

  it('uploads then acks, and stops when the queue is empty', async () => {
    drain.mockResolvedValueOnce({ points: [point(1), point(2)], pending: 2 });
    upsert.mockResolvedValue({ ok: true });
    ack.mockResolvedValue({ pending: 0 });
    const res = await flushLocationQueue('u1', async () => []);
    expect(res).toEqual({ uploaded: 2, pending: 0 });
    expect(ack).toHaveBeenCalledWith({ ids: [1, 2] });
  });

  it('keeps rows in the queue when upload fails (offline retry)', async () => {
    drain.mockResolvedValue({ points: [point(1)], pending: 1 });
    upsert.mockResolvedValue({ ok: false, error: 'network' });
    const res = await flushLocationQueue('u1', async () => []);
    expect(res.error).toBe('network');
    expect(ack).not.toHaveBeenCalled();
  });

  it('maps visit dwell and ISO timestamp', () => {
    const row = bufferedPointToRow('u1', { ...point(3), kind: 'visit', dwellSeconds: 900 }, []);
    expect(row.dwell_seconds).toBe(900);
    expect(row.kind).toBe('visit');
    expect(row.created_at).toBe(new Date(1_700_000_000_003).toISOString());
  });
});
