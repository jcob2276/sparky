/**
 * Weryfikacja podpisu webhooka Fathom (Standard Webhooks: id.timestamp.body, HMAC-SHA256)
 * i mapowanie payloadu spotkania na wiersz `closer_calls`.
 */
import { formatWarsawDate } from "@vanguard/domain";

const TOLERANCE_SECONDS = 300;

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyFathomSignature(
  secret: string,
  headers: Headers,
  rawBody: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!id || !timestamp || !signatures) return false;
  if (!Number.isFinite(Number(timestamp)) || Math.abs(nowSeconds - Number(timestamp)) > TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(b64ToBytes(secret.replace(/^whsec_/, ""))),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return signatures.split(" ").some((entry) => safeEqual(entry.replace(/^v\d+,/, ""), expected));
}

interface FathomMeeting {
  title?: string;
  meeting_title?: string | null;
  recording_id?: number;
  share_url?: string;
  scheduled_start_time?: string;
  recording_start_time?: string;
  recording_end_time?: string;
  calendar_invitees_domains_type?: string;
  transcript?: unknown[] | null;
  default_summary?: { markdown_formatted?: string | null } | null;
  action_items?: unknown[] | null;
  calendar_invitees?: unknown[];
}

export interface CloserCallRow {
  user_id: string;
  fathom_recording_id: number;
  title: string;
  call_date: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  share_url: string | null;
  has_external_invitees: boolean;
  summary_md: string | null;
  transcript: unknown[] | null;
  action_items: unknown[] | null;
  invitees: unknown[] | null;
}

export function mapMeetingToCall(userId: string, meeting: FathomMeeting): CloserCallRow | null {
  const startedAt = meeting.recording_start_time ?? meeting.scheduled_start_time;
  if (!meeting.recording_id || !startedAt || !Number.isFinite(Date.parse(startedAt))) return null;
  const endedAt = meeting.recording_end_time ?? null;
  const duration = endedAt && Number.isFinite(Date.parse(endedAt))
    ? Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000))
    : null;
  return {
    user_id: userId,
    fathom_recording_id: meeting.recording_id,
    title: meeting.meeting_title || meeting.title || "Rozmowa",
    call_date: formatWarsawDate(startedAt),
    started_at: startedAt,
    ended_at: endedAt,
    duration_seconds: duration,
    share_url: meeting.share_url ?? null,
    has_external_invitees: meeting.calendar_invitees_domains_type === "one_or_more_external",
    summary_md: meeting.default_summary?.markdown_formatted ?? null,
    transcript: meeting.transcript ?? null,
    action_items: meeting.action_items ?? null,
    invitees: meeting.calendar_invitees ?? null,
  };
}
