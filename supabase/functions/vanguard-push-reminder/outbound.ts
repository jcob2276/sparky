import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callTelegramMethod } from "../_shared/telegram.ts";

interface OutboundMessageRow {
  id: string;
  chat_id: number | string;
  content: string | null;
  payload?: {
    method?: string;
    body?: Record<string, unknown>;
  } | null;
}

export async function dispatchDueOutboundMessages(
  supabase: SupabaseClient,
  nowIso: string,
): Promise<number> {
  const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!telegramToken) return 0;

  // Give pg_net outbox-sender a 10s window to deliver immediate messages in real time.
  // Push-reminder acts strictly as a sweep for scheduled messages or delayed fallbacks.
  const sweepThresholdIso = new Date(Date.now() - 10000).toISOString();

  const { data: dueOutbound } = await supabase
    .from("outbound_messages")
    .select("*")
    .eq("status", "pending")
    .lte("send_after", sweepThresholdIso)
    .order("priority", { ascending: false })
    .order("send_after", { ascending: true })
    .limit(10);

  if (!dueOutbound || dueOutbound.length === 0) return 0;

  let sentCount = 0;
  for (const item of dueOutbound as OutboundMessageRow[]) {
    try {
      // Atomic lease: transition row from 'pending' to 'processing' before dispatching.
      // If another concurrent cron execution already grabbed it, leased is null and we skip.
      const { data: leased } = await supabase
        .from("outbound_messages")
        .update({
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (!leased) {
        // Row already acquired by concurrent worker
        continue;
      }

      const method = item.payload?.method || "sendMessage";
      const body = item.payload?.body || { chat_id: item.chat_id, text: item.content || "" };
      const res = await callTelegramMethod(telegramToken, method, body);
      if (res.ok) {
        await supabase.from("outbound_messages").update({
          status: "sent",
          updated_at: new Date().toISOString(),
        }).eq("id", item.id);
        sentCount++;
      } else {
        console.error(`[push-reminder] outbound ${item.id} failed:`, res.description);
        await supabase.from("outbound_messages").update({
          status: "failed",
          error_log: res.description,
          updated_at: new Date().toISOString(),
        }).eq("id", item.id);
      }
    } catch (err: unknown) {
      console.error(`[push-reminder] outbound send exception for ${item.id}:`, err);
      try {
        await supabase.from("outbound_messages").update({
          status: "failed",
          error_log: String(err),
          updated_at: new Date().toISOString(),
        }).eq("id", item.id);
      } catch {
        // ignore secondary error
      }
    }
  }

  return sentCount;
}
