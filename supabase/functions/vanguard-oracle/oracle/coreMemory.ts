/**
 * coreMemory.ts — Memory Inbox & Disciplined Core Memory Blocks (Letta pattern).
 * Manages persistent, constrained memory slots in vanguard_preferences:
 * - human: durable personal traits (TTL 60 days)
 * - focus: active sprint / weekly objective (TTL 7 days)
 * - avoidance: active friction pattern (TTL 7 days)
 *
 * Invariants:
 * 1. Strict length limit (max 220 chars per block).
 * 2. Mandatory TTL (expires_at) — blocks naturally decay rather than fossilize.
 * 3. Structured JSON storage with timestamps and expiration.
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

interface StoredMemoryEnvelope {
  text: string;
  updated_at: string;
  expires_at: string;
}

const PREFIX = "core_memory:";
const MAX_BLOCK_CHARS = 220;

function parseBlockValue(raw: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    const envelope = JSON.parse(raw) as StoredMemoryEnvelope;
    if (envelope.expires_at && new Date(envelope.expires_at).getTime() < Date.now()) {
      return undefined; // Block expired
    }
    return envelope.text || undefined;
  } catch {
    // Legacy plain string fallback
    return raw.trim() || undefined;
  }
}

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
    const parsed = parseBlockValue(row.value);
    if (!parsed) continue;

    if (row.key === `${PREFIX}human`) result.human = parsed;
    else if (row.key === `${PREFIX}focus`) result.focus = parsed;
    else if (row.key === `${PREFIX}avoidance`) result.avoidance = parsed;
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
  let cleanText = mutation.content.replace(/[\r\n]+/g, " ").trim();

  // Invariant: strict character limit to prevent context stuffing
  if (cleanText.length > MAX_BLOCK_CHARS) {
    cleanText = cleanText.slice(0, MAX_BLOCK_CHARS).trim() + "...";
  }

  // TTL: 7 days for focus & avoidance, 60 days for durable human traits
  const ttlDays = mutation.block === "human" ? 60 : 7;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

  const envelope: StoredMemoryEnvelope = {
    text: cleanText,
    updated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  const { error } = await supabase.from("vanguard_preferences").upsert(
    {
      user_id: userId,
      key,
      value: JSON.stringify(envelope),
      is_active: true,
      updated_at: now.toISOString(),
    },
    { onConflict: "user_id,key" },
  );

  if (error) {
    console.error(`[coreMemory] failed to upsert ${key}:`, error);
    return false;
  }

  console.log(`[coreMemory] updated block "${mutation.block}" (TTL ${ttlDays}d):`, cleanText);
  return true;
}
