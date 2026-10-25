/**
 * Analiza rozmowy sprzedażowej z transkryptu: wynik, błędy i dobre zagrania.
 * Wynik trafia do `closer_calls.ai_*` i jest czytany przez UI oraz Oracle (dataset closer_calls).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deepseekChat, parseJsonFromContent } from "./deepseek.ts";

const MAX_TRANSCRIPT_CHARS = 60000;
const OUTCOMES = ["closed", "follow_up", "lost", "unclear"] as const;

interface TranscriptLine {
  speaker?: { display_name?: string };
  text?: string;
  timestamp?: string;
}

interface CallMoment {
  timestamp: string;
  what: string;
  why: string;
}

interface CallAnalysis {
  outcome: (typeof OUTCOMES)[number];
  score: number;
  mistakes: CallMoment[];
  goodMoves: CallMoment[];
  nextStep: string | null;
}

const SYSTEM_PROMPT = `Jesteś trenerem sprzedaży analizującym rozmowę closera (użytkownik to sprzedawca). Odpowiadasz po polsku.
Na podstawie transkryptu zwróć WYŁĄCZNIE JSON:
{"outcome":"closed|follow_up|lost|unclear","score":1-10,"mistakes":[{"timestamp":"HH:MM:SS","what":"co zrobił źle","why":"dlaczego to szkodzi i co zrobić zamiast"}],"good_moves":[{"timestamp":"HH:MM:SS","what":"co zrobił dobrze","why":"dlaczego to zadziałało"}],"next_step":"konkretny następny krok z klientem albo null"}
Zasady: maksymalnie 5 błędów i 5 dobrych zagrań, tylko konkretne momenty z transkryptu, bez ogólników. Nie wymyślaj fragmentów, których nie ma w transkrypcie.`;

function transcriptToText(transcript: unknown[] | null): string {
  const lines = (transcript ?? []) as TranscriptLine[];
  const text = lines
    .map((l) => `[${l.timestamp ?? "--:--:--"}] ${l.speaker?.display_name ?? "?"}: ${l.text ?? ""}`)
    .join("\n");
  return text.slice(0, MAX_TRANSCRIPT_CHARS);
}

function asMoments(raw: unknown): CallMoment[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 5).flatMap((item) => {
    const m = item as Record<string, unknown>;
    return typeof m?.what === "string" && m.what.trim()
      ? [{ timestamp: String(m.timestamp ?? ""), what: m.what, why: String(m.why ?? "") }]
      : [];
  });
}

function parseAnalysis(content: string): CallAnalysis | null {
  const json = parseJsonFromContent(content);
  if (!json) return null;
  const outcome = OUTCOMES.find((o) => o === json.outcome) ?? "unclear";
  const score = Math.min(10, Math.max(1, Math.round(Number(json.score)) || 5));
  return {
    outcome,
    score,
    mistakes: asMoments(json.mistakes),
    goodMoves: asMoments(json.good_moves),
    nextStep: typeof json.next_step === "string" && json.next_step.trim() ? json.next_step : null,
  };
}

export async function analyzeCloserCall(
  supabase: SupabaseClient,
  userId: string,
  callId: string,
): Promise<void> {
  const { data: call, error } = await supabase
    .from("closer_calls")
    .select("title, summary_md, transcript")
    .eq("id", callId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;

  const transcript = transcriptToText(call.transcript as unknown[] | null);
  if (!transcript) {
    const { error: skipError } = await supabase
      .from("closer_calls").update({ ai_status: "skipped" }).eq("id", callId).eq("user_id", userId);
    if (skipError) throw skipError;
    return;
  }

  try {
    const res = await deepseekChat({
      apiKey: Deno.env.get("DEEPSEEK_API_KEY") || "",
      userId,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Rozmowa: ${call.title}\n\nTranskrypt:\n${transcript}` },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 1500,
      timeoutMs: 90000,
    });
    const analysis = parseAnalysis(res.content);
    if (!analysis) throw new Error("Analiza AI: niepoprawny JSON");
    const { error: saveError } = await supabase.from("closer_calls").update({
      ai_status: "done",
      ai_outcome: analysis.outcome,
      ai_score: analysis.score,
      ai_mistakes: analysis.mistakes,
      ai_good_moves: analysis.goodMoves,
      ai_next_step: analysis.nextStep,
      ai_analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", callId).eq("user_id", userId);
    if (saveError) throw saveError;
  } catch (err) {
    await supabase.from("closer_calls").update({ ai_status: "failed" }).eq("id", callId).eq("user_id", userId);
    throw err;
  }
}
