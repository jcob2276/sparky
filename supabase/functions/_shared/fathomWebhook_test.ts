import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapMeetingToCall, verifyFathomSignature } from "./fathomWebhook.ts";

const SECRET = "whsec_" + btoa("test-secret-bytes");

async function sign(id: string, ts: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", Uint8Array.from(atob(SECRET.slice(6)), (c) => c.charCodeAt(0)),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`));
  return "v1," + btoa(String.fromCharCode(...new Uint8Array(mac)));
}

Deno.test("verifyFathomSignature accepts valid and rejects tampered/stale", async () => {
  const body = '{"recording_id":1}';
  const headers = new Headers({ "webhook-id": "m1", "webhook-timestamp": "1000", "webhook-signature": await sign("m1", "1000", body) });
  assertEquals(await verifyFathomSignature(SECRET, headers, body, 1010), true);
  assertEquals(await verifyFathomSignature(SECRET, headers, body + " ", 1010), false);
  assertEquals(await verifyFathomSignature(SECRET, headers, body, 5000), false);
});

Deno.test("mapMeetingToCall maps Warsaw date and rejects missing id", () => {
  const row = mapMeetingToCall("u1", {
    title: "Call", recording_id: 7, recording_start_time: "2026-10-24T22:30:00Z",
    recording_end_time: "2026-10-24T23:00:00Z", calendar_invitees_domains_type: "one_or_more_external",
  });
  assertEquals(row?.call_date, "2026-10-25");
  assertEquals(row?.duration_seconds, 1800);
  assertEquals(row?.has_external_invitees, true);
  assertEquals(mapMeetingToCall("u1", { title: "x" }), null);
});
