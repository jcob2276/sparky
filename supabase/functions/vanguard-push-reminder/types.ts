import type { LifeObligationKind } from "@vanguard/domain";
import type { AmbientPreloaded } from "./ambient.ts";

export interface PushSubscriptionRow {
  user_id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
}

export interface FcmTokenRow {
  user_id: string;
  token: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export interface SupplementRow {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  reminder_time: string | null;
  start_date: string | null;
  end_date: string | null;
  reminder_sent_date: string | null;
}

export interface Preloaded {
  ambient: AmbientPreloaded;
  dueOutbound: unknown[];
}

export interface LifeObligationRow {
  id: string;
  user_id: string;
  title: string;
  kind: LifeObligationKind;
  related_name: string | null;
  anchor_date: string;
  recurrence: string;
  lead_offsets: number[] | null;
  sent_reminders: unknown;
}
