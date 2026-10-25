/**
 * Analiza rozmowy sprzedażowej z transkryptu: wynik, błędy i dobre zagrania.
 * Wynik trafia do `closer_calls.ai_*` i jest czytany przez UI oraz Oracle (dataset closer_calls).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { groundCallMoments, type CallMoment, type TranscriptLineInput } from "@vanguard/domain";
import { deepseekChat, parseJsonFromContent } from "./deepseek.ts";

const MAX_TRANSCRIPT_CHARS = 60000;
const OUTCOMES = ["closed", "follow_up", "lost", "unclear"] as const;

interface CallAnalysis {
  outcome: (typeof OUTCOMES)[number];
  score: number;
  mistakes: CallMoment[];
  goodMoves: CallMoment[];
  nextStep: string | null;
}

const SYSTEM_PROMPT = `Jesteś trenerem sprzedaży, który pomaga closerowi (użytkownikowi) uczyć się z własnej rozmowy. Odpowiadasz po polsku.
Zwróć WYŁĄCZNIE JSON:
{"outcome":"closed|follow_up|lost|unclear","score":1-10,
 "mistakes":[{"timestamp":"HH:MM:SS","quote":"dosłowny krótki cytat z transkryptu","what":"obserwacja","why":"hipoteza","experiment":"jeden mały eksperyment"}],
 "good_moves":[{"timestamp":"HH:MM:SS","quote":"dosłowny krótki cytat z transkryptu","what":"obserwacja","why":"hipoteza","experiment":"jak to powtórzyć"}],
 "next_step":"konkretny następny krok z klientem albo null"}
Zasady:
- Najwyżej 5 elementów w każdej liście. "timestamp" i "quote" muszą pochodzić z transkryptu (cytat 3–15 słów, przepisany dosłownie); bez nich pomiń moment.
- "what" to neutralna obserwacja: co zostało powiedziane i co się wydarzyło dalej, bez ocen typu "błąd" czy "źle".
- "why" to hipoteza, nie wyrok: pisz "możliwe, że…", "być może…", podaj jedną alternatywną interpretację, jeśli istnieje. Żadnych reguł typu "zawsze" albo "nigdy" (np. o kolejności ceny i pytania o decyzję).
- "experiment" to jeden mały, sprawdzalny krok na następną rozmowę (jedno zdanie, coś do powiedzenia albo zapytania).
- Nie zakładaj niczego o finansach, budżecie ani zwrocie z inwestycji klienta, jeśli klient sam o tym nie powiedział.
- Nie oceniaj emocji ani stanu psychicznego żadnej ze stron; opisuj słowa i reakcje.
- "score" ocenia przebieg rozmowy (proces sprzedaży), nie to, czy klient kupił. Gdy z transkryptu nie wynika, jak skończyła się rozmowa, "outcome" to "unclear".`;

function transcriptToText(transcript: unknown[] | null): string {
  const lines = (transcript ?? []) as TranscriptLineInput[];
  const text = lines
    .map((l) => `[${l.timestamp ?? "--:--:--"}] ${l.speaker?.display_name ?? "?"}: ${l.text ?? ""}`)
    .join("\n");
  return text.slice(0, MAX_TRANSCRIPT_CHARS);
}

function parseAnalysis(content: string, transcript: TranscriptLineInput[]): CallAnalysis | null {
  const json = parseJsonFromContent(content);
  if (!json) return null;
  const outcome = OUTCOMES.find((o) => o === json.outcome) ?? "unclear";
  const score = Math.min(10, Math.max(1, Math.round(Number(json.score)) || 5));
  return {
    outcome,
    score,
    // tylko momenty z prawdziwym czasem i cytatem z transkryptu (model potrafi je zmyślić)
    mistakes: groundCallMoments(json.mistakes, transcript),
    goodMoves: groundCallMoments(json.good_moves, transcript),
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
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Rozmowa: ${call.title}\n\nTranskrypt:\n${transcript}` },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 2500,
      timeoutMs: 90000,
    });
    const analysis = parseAnalysis(res.content, (call.transcript ?? []) as TranscriptLineInput[]);
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
