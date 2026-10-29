/**
 * reconciliationsRepo.ts — Typed queries for daily_reconciliations table.
 *
 * Thin data-access layer. Business logic stays in calling functions.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "../database.types.ts";

type Client = SupabaseClient<Database>;
type ReconciliationRow = Database["public"]["Tables"]["daily_reconciliations"]["Row"];

export async function getReconciliationById(
  db: Client,
  id: string,
): Promise<ReconciliationRow | null> {
  const { data, error } = await db
    .from("daily_reconciliations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLatestSentReconciliation(
  db: Client,
  userId: string,
): Promise<ReconciliationRow | null> {
  const { data, error } = await db
    .from("daily_reconciliations")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "sent")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
