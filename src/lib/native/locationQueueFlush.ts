/**
 * Uploads the native offline location queue to location_history.
 * At-least-once: rows are acked only after a successful idempotent upsert, so a failed
 * upload (no network, expired session) simply retries on the next trigger.
 */
import { resolvePlaceName, type LocationPoi } from '@vanguard/domain';
import { upsertLocationPoints, type LocationHistoryInsert } from '../locationHistoryApi';
import { LocationBuffer, type BufferedLocationPoint } from './locationBufferPlugin';
import { isAndroid } from './platform';

const BATCH_SIZE = 200;
const MAX_BATCHES_PER_FLUSH = 10;

let inFlight: Promise<LocationFlushResult> | null = null;

export interface LocationFlushResult {
  uploaded: number;
  pending: number;
  error?: string;
}

export function bufferedPointToRow(
  userId: string,
  point: BufferedLocationPoint,
  pois: LocationPoi[],
): LocationHistoryInsert {
  return {
    user_id: userId,
    latitude: point.lat,
    longitude: point.lng,
    accuracy: point.accuracy ?? null,
    speed: point.speed ?? null,
    bearing: point.bearing ?? null,
    altitude: point.altitude ?? null,
    provider: point.provider ?? null,
    kind: point.kind,
    dwell_seconds: point.dwellSeconds ?? null,
    place_name: resolvePlaceName(point.lat, point.lng, pois),
    is_manual: false,
    created_at: new Date(point.ts).toISOString(),
  };
}

async function runFlush(userId: string, loadPois: () => Promise<LocationPoi[]>): Promise<LocationFlushResult> {
  let uploaded = 0;
  let pending = 0;
  try {
    const pois = await loadPois();
    for (let i = 0; i < MAX_BATCHES_PER_FLUSH; i++) {
      const batch = await LocationBuffer.drain({ limit: BATCH_SIZE });
      pending = batch.pending;
      if (batch.points.length === 0) break;

      const result = await upsertLocationPoints(
        batch.points.map((p) => bufferedPointToRow(userId, p, pois)),
      );
      if (!result.ok) return { uploaded, pending, error: result.error ?? 'upload_failed' };

      const acked = await LocationBuffer.ack({ ids: batch.points.map((p) => p.id) });
      uploaded += batch.points.length;
      pending = acked.pending;
      if (batch.points.length < BATCH_SIZE) break;
    }
    return { uploaded, pending };
  } catch (err: unknown) {
    return { uploaded, pending, error: err instanceof Error ? err.message : 'flush_failed' };
  }
}

/** Single-flight: concurrent triggers (tick + resume + online) share one upload. */
export function flushLocationQueue(
  userId: string,
  loadPois: () => Promise<LocationPoi[]>,
): Promise<LocationFlushResult> {
  if (!isAndroid() || !userId) return Promise.resolve({ uploaded: 0, pending: 0 });
  if (inFlight) return inFlight;
  inFlight = runFlush(userId, loadPois).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
