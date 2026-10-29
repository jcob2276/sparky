import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isWorldStateCacheFresh, WORLD_STATE_CACHE_TTL_MS } from "./worldStateCache.ts";

Deno.test("isWorldStateCacheFresh: within TTL", () => {
  const now = Date.parse("2026-10-29T12:00:00Z");
  const updated = new Date(now - 5 * 60 * 1000).toISOString();
  assertEquals(isWorldStateCacheFresh(updated, now), true);
});

Deno.test("isWorldStateCacheFresh: expired TTL (incl. historical days)", () => {
  const now = Date.parse("2026-10-29T12:00:00Z");
  const updated = new Date(now - WORLD_STATE_CACHE_TTL_MS - 1).toISOString();
  assertEquals(isWorldStateCacheFresh(updated, now), false);
});

Deno.test("isWorldStateCacheFresh: invalid timestamp is stale", () => {
  assertEquals(isWorldStateCacheFresh("not-a-date", Date.now()), false);
});
