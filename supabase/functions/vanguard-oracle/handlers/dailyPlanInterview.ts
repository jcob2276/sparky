import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveUserScope } from "../../_shared/supabase.ts";
import { deepseekChat, parseJsonFromContent } from "../../_shared/deepseek.ts";
import { LLM_TASKS } from "../../_shared/llm/tasks.ts";

export interface PlanSlot {
  slot: number;
  category: "cialo" | "duch" | "konto" | "general";
  title: string;
}

export interface PlanInterviewResult {
  reply: string;
  is_ready: boolean;
  slots: PlanSlot[];
}

export async function handleDailyPlanInterview(
  req: Request,
  body: any,
  db: SupabaseClient,
): Promise<PlanInterviewResult> {
  const { userId: scopeId } = await resolveUserScope(req, body.userId ?? null);
  const userId = scopeId ?? body.userId;
  if (!userId) throw new Error("userId required");

  const apiKey = Deno.env.get("DEEPSEEK_API_KEY") || "";
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");

  const planningDate = String(body.planningDate || new Date().toISOString().slice(0, 10));
  const messages: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body.messages) ? body.messages : [];
  const currentSlots: PlanSlot[] = Array.isArray(body.currentSlots) ? body.currentSlots : [];

  const [todoRes, calRes, ouraRes] = await Promise.all([
    db.from("todo_items")
      .select("id, title, priority, due_date")
      .eq("user_id", userId)
      .eq("status", "open")
      .order("priority", { ascending: true })
      .limit(10),
    db.from("vanguard_calendar")
      .select("start_time, end_time, summary")
      .eq("user_id", userId)
      .gte("start_time", `${planningDate}T00:00:00`)
      .lt("start_time", `${planningDate}T23:59:59`)
      .limit(10),
    db.from("oura_daily_summary")
      .select("score_readiness, score_sleep, total_sleep_duration")
      .eq("user_id", userId)
      .order("day", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const openTodos = (todoRes.data || []).map((t: any) => `- [${t.priority}] ${t.title}`).join("\n");
  const calEvents = (calRes.data || []).map((e: any) => `- ${e.start_time?.slice(11, 16)} - ${e.end_time?.slice(11, 16)}: ${e.summary}`).join("\n");
  const oura = ouraRes.data ? `Gotowość Oura: ${ouraRes.data.score_readiness ?? 'Brak'}/100, Sen: ${ouraRes.data.score_sleep ?? 'Brak'}/100` : "";

  const systemPrompt = `Jesteś Sparky — bezkompromisowym, precyzyjnym asystentem i planerem dnia Jakuba.
Twoim zadaniem jest pomóc Jakubowi zaplanować dzień ${planningDate} poprzez rozmowę (Jakub dyktuje Ci głosem swoje cele i zamierzenia).
Wspólnie z Jakubem układacie DOKŁADNIE 5 priorytetów (zwycięstw dnia) z podziałem na filary:

KATEGORIE 5 PRIORYTETÓW:
Slot 1: "cialo" (Ciało) — Trening, bieg, siłownia, regeneracja, sen, zdrowie, posiłki.
Slot 2: "duch" (Duch) — Rozwój, medytacja, czytanie książki, dyscyplina, umysł, reset mentalny.
Slot 3: "konto" (Konto) — Praca, biznes, finanse, kluczowy dowieziony rezultat komercyjny/zawodowy.
Slot 4: "general" (Ruch 4) — Ważne zadanie operacyjne lub projektowe.
Slot 5: "general" (Ruch 5) — Drugie zadanie operacyjne, domknięcie spraw lub kluczowy obowiązek.

ZASADY:
1. Twoje odpowiedzi muszą być zwięzłe, motywujące i bardzo konkretne (maksymalnie 2-3 zdania). Zwracaj się bezpośrednio do Jakuba.
2. DOPYTUJ O SZCZEGÓŁY: Jeśli Jakub rzuca ogólnik (np. "chcę potrenować i popracować"), dopytaj o szczegóły (Jaki trening? Co dokładnie na Konto w pracy? A co na Duch?). Zadawaj 1-2 krótkie, celne pytania.
3. Gdy Jakub podaje informacje, od razu wpisuj/aktualizuj konkretne zadania do odpowiednich slotów. Każdy tytuł zadania ma być konkretny, zaczynać się od czasownika (np. "Bieg 10km w tempie Z2", "Wdrożenie modułu transkrypcji").
4. Jeśli któryś slot jest jeszcze pusty, możesz zaproponować logiczne zadanie na podstawie otwartych zadań Jakuba lub jego stałych nawyków i zapytać czy mu to pasuje.
5. "is_ready":
   - Ustaw na true TYLKO wtedy, gdy wszystkie 5 slotów ma sensowne, konkretne tytuły, a Jakub sprecyzował swoje plany lub zaakceptował propozycję. Wtedy podsumuj krótko energię planu i zachęć do zatwierdzenia.
   - W przeciwnym razie ustaw false i dopytaj o brakujące elementy.

KONTEKST JAKUBA:
${oura ? `Biometria: ${oura}\n` : ""}${calEvents ? `Kalendarz na ten dzień:\n${calEvents}\n` : ""}${openTodos ? `Otwarte zadania w To-do:\n${openTodos}\n` : ""}
Aktualny szkic slotów:
${JSON.stringify(currentSlots, null, 2)}

ODPOWIEDZ W POPRAWNYM FORMACIE JSON:
{
  "reply": "Twoja krótka wypowiedź (maks 2-3 zdania: dopytanie o szczegóły lub podsumowanie)",
  "is_ready": true | false,
  "slots": [
    { "slot": 1, "category": "cialo", "title": "..." },
    { "slot": 2, "category": "duch", "title": "..." },
    { "slot": 3, "category": "konto", "title": "..." },
    { "slot": 4, "category": "general", "title": "..." },
    { "slot": 5, "category": "general", "title": "..." }
  ]
}`;

  const conversation = messages.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  if (conversation.length === 0) {
    conversation.push({
      role: "user",
      content: "Cześć, chcę zaplanować dzisiejszy dzień.",
    });
  }

  const result = await deepseekChat({
    apiKey,
    ...LLM_TASKS.structured,
    messages: [
      { role: "system", content: systemPrompt },
      ...conversation,
    ],
    maxTokens: 800,
    temperature: 0.3,
  });

  const parsed = parseJsonFromContent(result.content) || {};
  const reply: string = typeof parsed.reply === "string" && parsed.reply.trim()
    ? parsed.reply.trim()
    : "Opowiedz mi, co chcesz dzisiaj osiągnąć — ułożymy plan.";
  const is_ready: boolean = Boolean(parsed.is_ready);

  const rawSlots: any[] = Array.isArray(parsed.slots) ? parsed.slots : [];
  const defaultCategories: Array<"cialo" | "duch" | "konto" | "general"> = ["cialo", "duch", "konto", "general", "general"];

  const slots: PlanSlot[] = [1, 2, 3, 4, 5].map(idx => {
    const raw = rawSlots.find((s: any) => s.slot === idx) || currentSlots.find((s: any) => s.slot === idx);
    const cat = defaultCategories[idx - 1];
    return {
      slot: idx,
      category: (raw?.category as any) || cat,
      title: typeof raw?.title === "string" ? raw.title.trim() : "",
    };
  });

  return {
    reply,
    is_ready,
    slots,
  };
}
