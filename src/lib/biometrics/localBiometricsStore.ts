/**
 * @file localBiometricsStore.ts
 * @role Native SQLite read facade — queries OuraLocalDb (Android Room-equivalent)
 *       via BleProbe.queryLocalMetrics(). No localStorage, no manual deduplication.
 *
 * Architecture: mirrors noop WhoopRepository read path.
 *   BLE driver → OuraStreamStore (INSERT OR IGNORE) → this module reads back.
 *   JS only calls queryLocalMetrics() after receiving the 'ouraDataUpdated' event.
 *
 * @usedBy ouraBleSync.ts, biometricsApi.ts
 */

/** Daily biometrics row — matches OuraStreamStore.queryDailyMetrics() JSON shape. */
export interface LocalDailyMetric {
  date: string;
  total_sleep_hours: number | null;
  deep_sleep_hours: number | null;
  rem_sleep_hours: number | null;
  light_sleep_hours: number | null;
  hrv_avg: number | null;
  rhr_avg: number | null;
  spo2_avg: number | null;
  temp_deviation: number | null;
  recovery: number | null;
  strain: number | null;
}

/**
 * Pull daily metric rows from the native SQLite store.
 * Returns empty array when not on Android or when no BLE data has been written yet.
 *
 * @param deviceId   The ring's device id used at insert time ("oura:<address>").
 * @param limit      Max rows to return (default 90).
 */
export async function queryLocalDailyMetrics(
  deviceId: string,
  limit = 90,
): Promise<LocalDailyMetric[]> {
  try {
    // Dynamic import so this module is safe to import on web (no Capacitor plugin available).
    const { BleProbe } = await import('../native/bleProbePlugin');
    const result = await (BleProbe as any).queryLocalMetrics({ deviceId, limit });
    if (!result?.rows) return [];
    const rows: LocalDailyMetric[] = JSON.parse(result.rows);
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.warn('[localBiometricsStore] queryLocalDailyMetrics failed:', err);
    return [];
  }
}

/**
 * Get the single latest day's metrics from local SQLite.
 * Returns null when nothing has been written yet.
 */
