/**
 * coreMemory.ts — Self-Editing Core Memory Blocks (Letta / MemGPT pattern).
 * Manages persistent, editable memory slots in vanguard_preferences:
 * - human: durable traits and non-negotiables
 * - focus: current active sprint / weekly objective
 * - avoidance: active procrastination patterns to interrupt
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CoreMemoryBlocks {
  human?: string;
  focus?: string;
  avoidance?: string;
}

export interface CoreMemoryMutation {
  block: "human" | "focus" | "avoidance";
  action: "set" | "append";
  content: string;
}

const PREFIX = "core_memory:";

export async function fetchCoreMemory(
  supabase: SupabaseClient,
  userId: string,
): Promise<CoreMemoryBlocks> {
  const { data } = await supabase
    .from("vanguard_preferences")
    .select("key, value")
    .eq("user_id", userId)
    .eq("is_active", true)
    .like("key", `${PREFIX}%`);

  const result: CoreMemoryBlocks = {};
  for (const row of data || []) {
    if (row.key === `${PREFIX}human`) result.human = row.value;
    else if (row.key === `${PREFIX}focus`) result.focus = row.value;
    else if (row.key === `${PREFIX}avoidance`) result.avoidance = row.value;
  }
  return result;
}

export async function applyCoreMemoryMutation(
  supabase: SupabaseClient,
  userId: string,
  mutation: CoreMemoryMutation,
): Promise<boolean> {
  if (!mutation || !mutation.block || !mutation.content) return false;

  const validBlocks = ["human", "focus", "avoidance"];
  if (!validBlocks.includes(mutation.block)) return false;

  const key = `${PREFIX}${mutation.block}`;
  let finalValue = mutation.content.trim();

  if (mutation.action === "append") {
    const { data: existing } = await supabase
      .from("vanguard_preferences")
      .select("value")
      .eq("user_id", userId)
      .eq("key", key)
      .maybeSingle();

    if (existing?.value) {
      finalValue = `${existing.value}\n- ${finalValue}`;
    }
  }

  const { error } = await supabase.from("vanguard_preferences").upsert(
    {
      user_id: userId,
      key,
      value: finalValue,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,key" },
  );

  if (error) {
    console.error(`[coreMemory] failed to upsert ${key}:`, error);
    return false;
  }

  console.log(`[coreMemory] updated block "${mutation.block}":`, finalValue.slice(0, 80));
  return true;
}
