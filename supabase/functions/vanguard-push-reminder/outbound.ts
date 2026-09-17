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

  const { data: dueOutbound } = await supabase
    .from("outbound_messages")
    .select("*")
    .eq("status", "pending")
    .lte("send_after", nowIso)
    .order("priority", { ascending: false })
    .order("send_after", { ascending: true })
    .limit(10);

  if (!dueOutbound || dueOutbound.length === 0) return 0;

  let sentCount = 0;
  for (const item of dueOutbound as OutboundMessageRow[]) {
    try {
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
    }
  }

  return sentCount;
}
