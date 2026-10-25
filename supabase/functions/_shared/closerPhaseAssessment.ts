/**
 * Druga część analizy rozmowy: typ rozmowy i ocena każdego etapu (1-5) względem kryteriów.
 * Kryteria bierze z `sales_playbook_criteria` użytkownika, a dla etapów bez własnych z domyślnych (`@vanguard/domain`).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CALL_PHASES, DEFAULT_PHASE_CRITERIA, callKind, groundPhaseAssessments,
  type CallKind, type PhaseAssessment, type PhaseCriteria, type TranscriptLineInput,
} from "@vanguard/domain";
import { deepseekChat, parseJsonFromContent } from "./deepseek.ts";

export interface CallPhaseResult {
  kind: CallKind | null;
  phases: PhaseAssessment[];
}

export async function loadPhaseCriteria(supabase: SupabaseClient, userId: string): Promise<PhaseCriteria> {
  const { data, error } = await supabase
    .from("sales_playbook_criteria")
    .select("phase, criterion_key, label")
    .eq("user_id", userId).eq("active", true).order("sort_order");
  if (error) throw error;
  const criteria = structuredClone(DEFAULT_PHASE_CRITERIA);
  for (const phase of CALL_PHASES) {
    const own = (data ?? []).filter((row: { phase: string }) => row.phase === phase);
    if (own.length) criteria[phase] = own.map((row: { criterion_key: string; label: string }) => ({ id: row.criterion_key, label: row.label }));
  }
  return criteria;
}

const systemPrompt = (criteria: PhaseCriteria) => `Oceniasz etapy rozmowy sprzedażowej closera (użytkownik) względem kryteriów. Odpowiadasz po polsku.
Zwróć WYŁĄCZNIE JSON:
{"call_kind":"sales|training|other","phases":[{"phase":"etap","score":1-5,"met":["id kryterium"],"missed":["id kryterium"],"evidence":"dosłowny cytat z transkryptu"}]}
Zasady:
- "call_kind": "sales" gdy to rozmowa z potencjalnym klientem o zakupie; "training" gdy to szkolenie, coaching lub nauka; inaczej "other". Dla "training" i "other" zwróć pustą listę "phases".
- Oceniaj tylko etapy, które faktycznie wystąpiły w rozmowie. Każdy etap najwyżej raz.
- "score": 1 = prawie żadne kryterium spełnione, 3 = około połowy, 5 = wszystkie spełnione dobrze. Oceniaj wykonanie, nie to, czy klient kupił.
- "met" i "missed" tylko z id kryteriów poniżej, dla danego etapu. Kryterium niesprawdzalne w tej rozmowie pomiń.
- "evidence": jeden dosłowny cytat (3–15 słów) z transkryptu, który najlepiej uzasadnia ocenę etapu.
- Nie oceniaj emocji ani stanu psychicznego; opisuj to, co zostało powiedziane.
Etapy i kryteria:
${CALL_PHASES.map((phase) => `${phase}:\n${criteria[phase].map((k) => `  - ${k.id}: ${k.label}`).join("\n")}`).join("\n")}`;

export async function assessCallPhases(
  userId: string,
  title: string,
  transcriptText: string,
  transcript: TranscriptLineInput[],
  criteria: PhaseCriteria,
): Promise<CallPhaseResult> {
  const res = await deepseekChat({
    apiKey: Deno.env.get("DEEPSEEK_API_KEY") || "",
    userId,
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt(criteria) },
      { role: "user", content: `Rozmowa: ${title}\n\nTranskrypt:\n${transcriptText}` },
    ],
    responseFormat: { type: "json_object" },
    maxTokens: 1800,
    timeoutMs: 90000,
  });
  const json = parseJsonFromContent(res.content);
  if (!json) throw new Error("Ocena etapów: niepoprawny JSON");
  const kind = callKind(json.call_kind);
  return { kind, phases: kind === "sales" ? groundPhaseAssessments(json.phases, transcript, criteria) : [] };
}
