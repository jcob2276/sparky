/** Cache TTL for today and historical days. Corrections must invalidate rows; no infinite past. */
export const WORLD_STATE_CACHE_TTL_MS = 15 * 60 * 1000;

export function isWorldStateCacheFresh(
  updatedAt: string,
  nowMs: number,
  ttlMs: number = WORLD_STATE_CACHE_TTL_MS,
): boolean {
  const updatedMs = new Date(updatedAt).getTime();
  if (!Number.isFinite(updatedMs)) return false;
  const cacheAgeMs = nowMs - updatedMs;
  return cacheAgeMs >= 0 && cacheAgeMs < ttlMs;
}
