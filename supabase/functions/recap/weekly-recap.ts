import { createServiceClient, resolveUserScope } from "../_shared/supabase.ts";
import { deepseekChat, parseJsonFromContent } from "../_shared/deepseek.ts";
import { LLM_TASKS } from "../_shared/llm/tasks.ts";
import { addDaysStr } from "./helpers.ts";
import { gatherWeekFacts } from "./gatherWeekFacts.ts";
import { factsToPrompt } from "./prompts.ts";
import { runMonthlyRecap } from "./monthlyRecap.ts";

export async function runWeeklyRecap(req: Request): Promise<unknown> {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId: scopedUserId } = await resolveUserScope(req, body.userId ?? null);
    const userId = scopedUserId;
    if (!userId) throw new Error("userId required");
    const phase: string = body.phase;
    if (phase !== "before" && phase !== "after" && phase !== "month") throw new Error("phase must be 'before', 'after', or 'month'");

    const db = createServiceClient();
    const apiKey = Deno.env.get("DEEPSEEK_API_KEY") || "";
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");

    // ── PHASE MONTH ─────────────────────────────────────────────────────────
    if (phase === "month") {
      const monthStart: string = body.monthStart;
      if (!monthStart) throw new Error("monthStart required for phase month");
      return await runMonthlyRecap(db, userId, apiKey, monthStart);
    }

    const weekStart: string = body.weekStart;
    if (!weekStart) throw new Error("weekStart required");

    const facts = await gatherWeekFacts(db, userId, weekStart);
    const factsBlock = factsToPrompt(facts);

    // ── PHASE BEFORE ────────────────────────────────────────────────────────
    if (phase === "before") {
      const eightWeeksBack = addDaysStr(weekStart, -56);
      const prevWeekStart = addDaysStr(weekStart, -7);

      const [prevReviewsRes, historicalStreamRes] = await Promise.all([
        db.from("weekly_reviews").select("week_start, proud_of, do_differently, sabotage, obligation, week_highlight, week_regret, new_belief, pillar_scores, week_intention, week_goal_cialo, week_goal_duch, week_goal_konto, ai_recap").eq("user_id", userId).gte("week_start", eightWeeksBack).lt("week_start", weekStart).order("week_start"),
        db.from("vanguard_stream").select("timestamp, source, classification, content, importance_score").eq("user_id", userId).gte("timestamp", eightWeeksBack).lt("timestamp", weekStart + "T00:00:00").or("importance_score.gte.5,source.eq.identity_vault").order("importance_score", { ascending: false }).limit(40),
      ]);

      const prevReviews = (prevReviewsRes.data ?? []) as Record<string, unknown>[];
      const lastWeekReview = prevReviews.find((r) => r.week_start === prevWeekStart);

      const lastWeekPlan = lastWeekReview ? [
        lastWeekReview.week_intention && `Intencja: ${lastWeekReview.week_intention}`,
        lastWeekReview.week_goal_cialo && `Cel Ciało: ${lastWeekReview.week_goal_cialo}`,
        lastWeekReview.week_goal_duch && `Cel Duch: ${lastWeekReview.week_goal_duch}`,
        lastWeekReview.week_goal_konto && `Cel Konto: ${lastWeekReview.week_goal_konto}`,
      ].filter(Boolean).join(" · ") : null;

      const reviewHistory = prevReviews.slice(-4).map((r) => {
        const scores = (r.pillar_scores ?? {}) as Record<string, unknown>;
        const parts = [scores.cialo && `Ciało ${scores.cialo}`, scores.duch && `Duch ${scores.duch}`, scores.konto && `Konto ${scores.konto}`, r.obligation && `musi zejść: ${r.obligation}`, r.week_regret && `żałuję: ${r.week_regret}`];
        return parts.length ? `${r.week_start}: ${parts.filter(Boolean).join(" · ")}` : null;
      }).filter(Boolean);

      const historicalVoice = ((historicalStreamRes.data ?? []) as Record<string, unknown>[]).filter((s) => s.source === "identity_vault" || (s.source === "telegram" && String(s.content ?? "").length > 150)).slice(0, 20).map((s) => {
        const d = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", day: "numeric", month: "short", year: "numeric" }).format(new Date(s.timestamp as string));
        return `${d}: ${String(s.content).slice(0, 250)}`;
      });

      const systemPrompt = `Jesteś Antigravity — prywatny coach Jakuba, znasz go od środka. Piszesz PO POLSKU, bezpośrednio, na "Ty".
TWOJE ZADANIE: Napisz narrację tygodnia Jakuba — bezlitosną, precyzyjną, syntetyczną historię tego, jak żył i działał w tym tygodniu.
ZASADY (każda jest krytyczna):
1. WIDOK NA WSZYSTKO: Masz przed sobą ROK / BHAG (jego nadrzędny cel tożsamościowy, np. 365 dni No-Drift Morning), telemetrię telefonu (screen time, nocny ekran, odblokowania), biometrię Oura (godziny zaśnięcia i pobudki, dług snu), nazwy zadań z Power Listy (co zrobione, co omijane) oraz głosówki i notatki.
2. KONKRETNE NAZWY ZADAŃ: Wymieniaj zadania z Power Listy z nazwy! Wskaż twardo, które kluczowe zadania (np. diali, sales calls, trening, portfolio) leżały odłogiem, a które poboczne/bezpieczne zadania zamykał dla poczucia pozornego postępu.
3. WZORCE TELEFONU I SNU: Połącz telemetrię z zachowaniem. Czy nocny ekran i późne zaśnięcie rozwalały poranek i skupienie następnego dnia? Czy respektował No-Drift Morning, czy dryfował w telefonie?
4. NOTATKI ZAMYKAJĄCE DZIEŃ: Zwróć uwagę na to, czy zamykał dni autentyczną notatką refleksyjną, czy dni mijały w milczeniu bez słowa.
5. GŁOSÓWKI I SPRZECZNOŚCI: Cytuj konkretne frazy z datami. Skonfrontuj deklaracje z faktami.
6. "longterm_motif": TEN SAM MOTYW powracający w historii (np. krążenie zamiast docierania, unikanie konfrontacji z rynkiem, ucieczka w zadania poboczne). Null jeśli brak powtarzalności.
7. "question": JEDNO ostre, precyzyjne pytanie otwierające refleksję, zakorzenione w konkretnym fakcie, głosówce lub sprzeczności z tego tygodnia.
Długość narracji: 7-12 zdań.
Zwróć TYLKO JSON: {"narrative": "...", "longterm_motif": "..." | null, "question": "..."}`;

      const userPrompt = `${factsBlock}\n\nPLAN Z ZESZŁEGO TYGODNIA (${prevWeekStart}): ${lastWeekPlan ?? "(brak planu)"}\n\nHISTORIA OSTATNICH TYGODNI:\n${reviewHistory.join("\n") || "(brak historii)"}\n\nGŁOSÓWKI Z POPRZEDNICH TYGODNI:\n${historicalVoice.join("\n\n") || "(brak)"}`;

      const { content } = await deepseekChat({
        apiKey,
        ...LLM_TASKS.structured,
        maxTokens: 2000,
        temperature: 0.3,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }]
      });

      const parsed = parseJsonFromContent(content);
      if (!parsed || typeof parsed.narrative !== "string" || typeof parsed.question !== "string") throw new Error(`Invalid AI JSON phase1: ${content.slice(0, 300)}`);

      const phase1 = { narrative: parsed.narrative, longterm_motif: typeof parsed.longterm_motif === "string" ? parsed.longterm_motif : null, question: parsed.question };

      const { data: existing } = await db.from("weekly_reviews").select("ai_recap").eq("user_id", userId).eq("week_start", weekStart).maybeSingle();
      const mergedRecap = { ...(existing?.ai_recap ?? {}), phase1 };
      await db.from("weekly_reviews").upsert({ user_id: userId, week_start: weekStart, ai_recap: mergedRecap }, { onConflict: "user_id,week_start" });

      return { phase1 };
    }

    // ── PHASE AFTER ─────────────────────────────────────────────────────────
    const { data: review } = await db.from("weekly_reviews")
      .select("proud_of, do_differently, sabotage, obligation, week_highlight, week_regret, new_belief, pillar_scores, ai_recap, week_intention, week_goal_cialo, week_goal_duch, week_goal_konto")
      .eq("user_id", userId).eq("week_start", weekStart).maybeSingle();
    if (!review) throw new Error("Brak zapisanej refleksji — zapisz ją najpierw.");

    const scores = review.pillar_scores ?? {};
    const weekPlanLines = [
      review.week_intention && `Intencja: ${review.week_intention}`,
      review.week_goal_cialo && `Cel Ciało: ${review.week_goal_cialo}`,
      review.week_goal_duch && `Cel Duch: ${review.week_goal_duch}`,
      review.week_goal_konto && `Cel Konto: ${review.week_goal_konto}`,
    ].filter(Boolean).join(" · ") || "(brak planu na ten tydzień)";

    const systemPrompt = `Jesteś Antigravity — prywatny coach Jakuba. Myślisz jak Elon Musk, operujesz z First Principles i Zasadą Pareto 80/20. Piszesz PO POLSKU, bezpośrednio, na "Ty".
ZADANIA:
1. "narrative_check": Skonfrontuj to co Jakub napisał z twardymi danymi (PowerList, telemetria ekranu, Oura, głosówki). Czy nie okłamuje samego siebie? Gdzie jest wąskie gardło? Cytuj jego własne słowa. Max 3-4 zdania.
2. "deepening_questions": dokładnie 3 ostre, bezwzględne pytania First Principles (styl Elona Muska & Pareto 80/20). Zero lania wody. Uderzaj w sedno: co jest iluzją i pozornym ruchem, co jest 20% dźwignią, a co trzeba natychmiast skasować/uprościć.
3. "block5_material": dla każdego filaru (cialo, duch, konto) — JEDNA bezwzględna rekomendacja do planowania NASTĘPNEGO tygodnia oparta o zasadę dźwigni 80/20. Max 2 zdania per filar.
Zwróć TYLKO JSON: {"narrative_check": "...", "deepening_questions": ["...", "...", "..."], "block5_material": {"cialo": "...", "duch": "...", "konto": "..."}}`;

    const weekStep = review.week_intention?.trim() || null;
    const sprintBridge = facts.sprintGoal ? `Sprint: ${facts.sprintGoal} — ten tydzień jeden krok: ${weekStep || "—"}` : null;

    const userPrompt = `${factsBlock}\n\n${facts.monthTheme ? `TEMAT MIESIĄCA: ${facts.monthTheme}\n` : ""}${sprintBridge ? `MOST SPRINT→TYDZIEŃ: ${sprintBridge}\n` : ""}PLAN TEGO TYGODNIA: ${weekPlanLines}\n\nOCENY WŁASNE JAKUBA (1-10): Ciało ${scores.cialo ?? "?"}, Duch ${scores.duch ?? "?"}, Konto ${scores.konto ?? "?"}\n\nQ1 (Dźwignia 80/20 vs pozorny ruch): ${review.do_differently || "(nie wypełnił)"}\nQ2 (First Principles & Unikanie): ${review.sabotage || "(nie wypełnił)"}\nQ3 (Korekta algorytmu / Co usuwam): ${review.new_belief || "(nie wypełnił)"}\n\nNARRACJA (Blok 1): ${review.ai_recap?.phase1?.narrative ?? "(brak)"}`;

    const { content } = await deepseekChat({
      apiKey,
      ...LLM_TASKS.structured,
      maxTokens: 2500,
      temperature: 0.3,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }]
    });

    const parsed = parseJsonFromContent(content);
    if (!parsed || typeof parsed.narrative_check !== "string" || !Array.isArray(parsed.deepening_questions) || !parsed.block5_material) {
      throw new Error(`Invalid AI JSON phase2: ${content.slice(0, 300)}`);
    }

    const phase2 = {
      narrative_check: parsed.narrative_check,
      deepening_questions: parsed.deepening_questions.slice(0, 3).map(String),
      block5_material: { cialo: String((parsed.block5_material as Record<string, unknown>)?.cialo ?? ""), duch: String((parsed.block5_material as Record<string, unknown>)?.duch ?? ""), konto: String((parsed.block5_material as Record<string, unknown>)?.konto ?? "") },
    };

    const { data: existingForMerge } = await db.from("weekly_reviews").select("ai_recap").eq("user_id", userId).eq("week_start", weekStart).maybeSingle();
    const mergedRecap = { ...(existingForMerge?.ai_recap ?? {}), phase2 };
    await db.from("weekly_reviews").upsert({ user_id: userId, week_start: weekStart, ai_recap: mergedRecap }, { onConflict: "user_id,week_start" });

    return { phase2 };
  } catch (err: unknown) {
    console.error("[vanguard-week-recap] error:", err);
    throw err;
  }
}
