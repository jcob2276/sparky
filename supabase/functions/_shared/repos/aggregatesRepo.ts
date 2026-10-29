/**
 * aggregatesRepo.ts — Typed queries for vanguard_daily_aggregates table.
 *
 * Thin data-access layer. Business logic stays in calling functions.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "../database.types.ts";

type Client = SupabaseClient<Database>;
type AggregateRow = Database["public"]["Tables"]["vanguard_daily_aggregates"]["Row"];

export async function getAggregateByDate(
  db: Client,
  userId: string,
  date: string,
): Promise<AggregateRow | null> {
  const { data, error } = await db
    .from("vanguard_daily_aggregates")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data;
}
