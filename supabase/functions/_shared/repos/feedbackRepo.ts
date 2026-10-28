/**
 * feedbackRepo.ts — oceny odpowiedzi Oracle (vanguard_feedback), czytane do promptu.
 *
 * Zapisuje je vanguard-telegram/_handlers/feedback.ts (przyciski 👍/👎); to jedyny czytelnik tej tabeli.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "../database.types.ts";
import type { FeedbackExample } from "../feedbackPromptBlock.ts";

type Client = SupabaseClient<Database>;

const WINDOW_DAYS = 30;
const NEGATIVE_LIMIT = 5;
const POSITIVE_LIMIT = 3;

async function recentByScore(db: Client, userId: string, score: -1 | 1, limit: number, now: Date): Promise<FeedbackExample[]> {
  const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const { data, error } = await db
    .from("vanguard_feedback")
    .select("score,query,reply")
    .eq("user_id", userId)
    .eq("score", score)
    .gte("created_at", since.toISOString())
    .lte("created_at", now.toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`vanguard_feedback read failed: ${error.message}`);
  return data ?? [];
}

/** Ostatnie odrzucone (do 5) i docenione (do 3) odpowiedzi z 30 dni; najpierw odrzucone, każda grupa od najnowszej. */
export async function getRecentFeedback(db: Client, userId: string, now: Date = new Date()): Promise<FeedbackExample[]> {
  const [negative, positive] = await Promise.all([
    recentByScore(db, userId, -1, NEGATIVE_LIMIT, now),
    recentByScore(db, userId, 1, POSITIVE_LIMIT, now),
  ]);
  return [...negative, ...positive];
}
