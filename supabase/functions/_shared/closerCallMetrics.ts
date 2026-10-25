/**
 * Metryki prowadzenia rozmowy (udział w mówieniu, najdłuższa wypowiedź, tempo, pytania) liczone z transkryptu,
 * bez AI. „Ja" to mówca z adresem właściciela konta. Zapisywane w `closer_calls.call_metrics`.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeCallTalkMetrics, type CallTalkMetrics, type TranscriptLineInput } from "@vanguard/domain";

export async function loadCallMetrics(
  supabase: SupabaseClient,
  userId: string,
  transcript: TranscriptLineInput[],
): Promise<CallTalkMetrics | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) throw error;
  return computeCallTalkMetrics(transcript, data.user?.email ?? "");
}

/** Przelicza same metryki (bez wywołań AI), np. dla rozmów analizowanych, zanim metryki powstały. */
export async function refreshCallMetrics(supabase: SupabaseClient, userId: string, callId: string): Promise<CallTalkMetrics | null> {
  const { data: call, error } = await supabase
    .from("closer_calls").select("transcript").eq("id", callId).eq("user_id", userId).single();
  if (error) throw error;
  const metrics = await loadCallMetrics(supabase, userId, (call.transcript ?? []) as TranscriptLineInput[]);
  const { error: saveError } = await supabase
    .from("closer_calls").update({ call_metrics: metrics }).eq("id", callId).eq("user_id", userId);
  if (saveError) throw saveError;
  return metrics;
}
