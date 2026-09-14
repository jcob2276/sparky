import { createServiceClient, resolveUserScope } from "../_shared/supabase.ts";
import { deepseekChat, parseJsonFromContent } from "../_shared/deepseek.ts";
import { LLM_TASKS } from "../_shared/llm/tasks.ts";
import { addDaysStr } from "./helpers.ts";
import { gatherWeekFacts } from "./gatherWeekFacts.ts";
import { factsToPrompt } from "./prompts.ts";

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
      const monthEndDate = new Date(monthStart + "T12:00:00Z");
      monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
      monthEndDate.setUTCDate(0);
      const monthEndStr = monthEndDate.toISOString().split("T")[0];
      // include week starting up to 6 days before monthStart (week might start in prev month)
      const weekWindowStart = addDaysStr(monthStart, -6);

      const [
        reviewsRes, winsRes, kpiRes,
        streamRes, ouraRes, stravaRes,
        reconcRes, patternsRes, projectsRes,
        habitLogsRes, sprintGoalRes,
      ] = await Promise.all([
        // Full weekly reflections — all fields for rich context
        db.from("weekly_reviews")
          .select("week_start, review_completed_at, pillar_scores, week_intention, proud_of, do_differently, sabotage, week_highlight, week_regret, new_belief")
          .eq("user_id", userId)
          .gte("week_start", weekWindowStart)
          .lte("week_start", monthEndStr)
          .order("week_start"),
        // PowerList: Z/P per day
        db.from("daily_wins")
          .select("date, result")
          .eq("user_id", userId)
          .gte("date", monthStart)
          .lte("date", monthEndStr)
          .order("date"),
        // KPI entries
        db.from("kpi_entries")
          .select("week_start, value, kpi_id")
          .eq("user_id", userId)
          .gte("week_start", weekWindowStart)
          .lte("week_start", monthEndStr),
        // Voice entries + longer Telegram messages — top 30 by importance
        db.from("vanguard_stream")
          .select("timestamp, source, classification, content, importance_score")
          .eq("user_id", userId)
          .gte("timestamp", monthStart + "T00:00:00")
          .lte("timestamp", monthEndStr + "T23:59:59")
          .or("source.eq.identity_vault,source.eq.eval_interview,source.eq.telegram")
          .order("importance_score", { ascending: false })
          .limit(30),
        // Sleep: per-day for weekly trend analysis
        db.from("oura_daily_summary")
          .select("date, total_sleep_hours, readiness_score, sleep_score")
          .eq("user_id", userId)
          .gte("date", monthStart)
          .lte("date", monthEndStr)
          .order("date"),
        // Training (Strava)
        db.from("strava_activities")
          .select("start_date, name, sport_type, distance")
          .eq("user_id", userId)
          .gte("start_date", monthStart)
          .lte("start_date", monthEndStr + "T23:59:59"),
        // Daily reconciliations — only days with evening user text + all mode data
        db.from("daily_reconciliations")
          .select("date, day_score, mode, morning_action, user_response")
          .eq("user_id", userId)
          .gte("date", monthStart)
          .lte("date", monthEndStr)
          .order("date"),
        // Confirmed behavioral patterns
        db.from("vanguard_behavioral_patterns")
          .select("pattern_type, title, evidence_text, status, confidence, occurrence_count")
          .eq("user_id", userId)
          .neq("status", "archived")
          .neq("status", "user_rejected")
          .order("confidence", { ascending: false })
          .limit(8),
        // Active projects for context
        db.from("projects")
          .select("id, name, goal, status")
          .eq("user_id", userId)
          .eq("status", "active"),
        // Habit logs (red flags / triggers)
        db.from("habit_logs")
          .select("date, logged_at, final_stimulus, context_note")
          .eq("user_id", userId)
          .gte("date", monthStart)
          .lte("date", monthEndStr),
        // Sprint goal for context
        db.from("sprint_goals")
          .select("goal_text")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const reviews = (reviewsRes.data ?? []) as any[];
      const wins = (winsRes.data ?? []) as any[];
      const kpis = (kpiRes.data ?? []) as any[];
      const stream = (streamRes.data ?? []) as any[];
      const oura = (ouraRes.data ?? []) as any[];
      const strava = (stravaRes.data ?? []) as any[];
      const reconc = (reconcRes.data ?? []) as any[];
      const patterns = (patternsRes.data ?? []) as any[];
      const projects = (projectsRes.data ?? []) as any[];
      const habitLogs = (habitLogsRes.data ?? []) as any[];
      const sprintGoal = sprintGoalRes.data?.goal_text?.trim() || null;

      // ── Computed headline stats ──────────────────────────────────────────
      const weeksReviewed = reviews.filter((r) => r.review_completed_at).length;
      const zDays = wins.filter((w) => w.result === "Z").length;
      const pDays = wins.filter((w) => w.result === "P").length;
      const kpiWeeks = new Set(kpis.map((k) => k.week_start)).size;

      // ── Weekly sleep/readiness trend (group oura by ISO week) ─────────────
      function isoWeekStart(dateStr: string): string {
        const d = new Date(dateStr + "T12:00:00Z");
        const day = d.getUTCDay(); // 0=Sun
        const diff = (day === 0 ? -6 : 1 - day);
        d.setUTCDate(d.getUTCDate() + diff);
        return d.toISOString().split("T")[0];
      }
      const sleepByWeek = new Map<string, number[]>();
      const readinessByWeek = new Map<string, number[]>();
      for (const o of oura) {
        const w = isoWeekStart(o.date);
        if (o.total_sleep_hours != null) { if (!sleepByWeek.has(w)) sleepByWeek.set(w, []); sleepByWeek.get(w)!.push(o.total_sleep_hours); }
        if (o.readiness_score != null) { if (!readinessByWeek.has(w)) readinessByWeek.set(w, []); readinessByWeek.get(w)!.push(o.readiness_score); }
      }
      const sleepTrendLines = Array.from(sleepByWeek.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([w, hrs]) => {
        const avg = (hrs.reduce((a, b) => a + b, 0) / hrs.length).toFixed(1);
        const rd = readinessByWeek.get(w);
        const rdAvg = rd ? Math.round(rd.reduce((a, b) => a + b, 0) / rd.length) : null;
        return `tydz. ${w}: śr. ${avg}h${rdAvg != null ? `, readiness śr. ${rdAvg}` : ""}`;
      });

      // ── Strava summary ───────────────────────────────────────────────────
      const runs = strava.filter((a) => ["Run", "TrailRun", "VirtualRun"].includes(a.sport_type ?? ""));
      const gym = strava.filter((a) => ["WeightTraining", "Workout"].includes(a.sport_type ?? ""));
      const totalKm = runs.reduce((s: number, r: any) => s + (r.distance || 0), 0) / 1000;
      const stravaLine = [
        runs.length > 0 && `bieganie: ${runs.length}x, ${totalKm.toFixed(1)}km`,
        gym.length > 0 && `siłownia: ${gym.length}x`,
        strava.length === 0 && "brak zalogowanego treningu",
      ].filter(Boolean).join(" | ");

      // ── Weekly reflections block ─────────────────────────────────────────
      const reviewBlock = reviews.map((r) => {
        const scores = (r.pillar_scores ?? {}) as Record<string, unknown>;
        const scoreStr = ["cialo", "duch", "konto"].map((k) => scores[k] != null ? `${k[0].toUpperCase()}${scores[k]}` : null).filter(Boolean).join(" ");
        const lines = [
          `--- ${r.week_start}${r.review_completed_at ? " ✓" : " (brak refleksji)"} ${scoreStr ? `[${scoreStr}]` : ""} ---`,
          r.week_intention && `Intencja: ${r.week_intention}`,
          r.proud_of && `Dumny: ${r.proud_of}`,
          r.do_differently && `Inaczej: ${r.do_differently}`,
          r.sabotage && `Sabotaż: ${r.sabotage}`,
          r.week_highlight && `Energia: ${r.week_highlight}`,
          r.week_regret && `Żałuję: ${r.week_regret}`,
          r.new_belief && `Nowe przekonanie: ${r.new_belief}`,
        ].filter(Boolean);
        return lines.join("\n");
      }).join("\n\n");

      // ── Voice entries ─────────────────────────────────────────────────────
      const voiceEntries = stream.filter((s) => s.source === "identity_vault" || s.source === "eval_interview" || (s.source === "telegram" && String(s.content ?? "").length > 150));
      const voiceBlock = voiceEntries.slice(0, 30).map((v) => {
        const d = new Date(v.timestamp).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw", day: "numeric", month: "short", weekday: "short" });
        const src = v.source === "identity_vault" ? "głosówka" : v.source === "eval_interview" ? "wywiad AI" : "telegram";
        return `--- ${d} [${src}${v.classification ? `·${v.classification}` : ""}] ---\n${String(v.content).slice(0, 500)}`;
      }).join("\n\n");

      // ── Reconciliations — only days with evening text ─────────────────────
      const reconcWithText = reconc.filter((r) => r.user_response?.trim());
      const reconcBlock = reconcWithText.map((r) => {
        const parts = [`${r.date} [${r.mode ?? "?"}] ${r.day_score != null ? `${r.day_score}/10` : ""}`];
        if (r.morning_action) parts.push(`→ Intencja: ${r.morning_action}`);
        parts.push(`→ Wieczór: ${String(r.user_response).slice(0, 300)}`);
        return parts.join("\n");
      }).join("\n\n");

      // ── Behavioral patterns ────────────────────────────────────────────────
      const patternsBlock = patterns.length
        ? patterns.map((p) => `- [${p.status}] ${p.title || p.pattern_type}: ${p.evidence_text} (confidence: ${p.confidence}, wystąpień: ${p.occurrence_count})`).join("\n")
        : "(brak potwierdzonych wzorców)";

      // ── Projects ──────────────────────────────────────────────────────────
      const projectsBlock = projects.length
        ? projects.map((p) => `- ${p.name}${p.goal ? ` (cel: ${p.goal})` : ""}`).join("\n")
        : "(brak aktywnych projektów)";

      // ── Habits ────────────────────────────────────────────────────────────
      const habitsBlock = habitLogs.length
        ? habitLogs.map((l) => {
            const t = l.logged_at ? new Date(l.logged_at).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw", day: "numeric", month: "short", weekday: "short" }) : l.date;
            return `${t}${l.final_stimulus ? ` — ${l.final_stimulus}` : ""}${l.context_note ? ` (${l.context_note})` : ""}`;
          }).join("\n")
        : "(brak)";

      // ── Final facts block ─────────────────────────────────────────────────
      const factsBlock = `MIESIĄC ${monthStart} – ${monthEndStr}
${sprintGoal ? `CEL SPRINTU (kontekst): ${sprintGoal}\n` : ""}
POWERLIST: ${zDays} dni Z (wygrane), ${pDays} dni P (przegrane), ${wins.length - zDays - pDays} bez wyniku
Tygodnie z refleksją: ${weeksReviewed}/${reviews.length} | Tygodnie z KPI: ${kpiWeeks}

AKTYWNE PROJEKTY:
${projectsBlock}

TYGODNIOWE REFLEKSJE (pełne):
${reviewBlock || "(brak)"}

SEN I GOTOWOŚĆ (trend tygodniowy):
${sleepTrendLines.join("\n") || "brak danych snu"}

TRENING (Strava):
${stravaLine}

NAWYKI (czerwone flagi):
${habitsBlock}

WZORCE BEHAWIORALNE (potwierdzone w systemie):
${patternsBlock}

RECONCILIACJE — wieczorne wpisy Jakuba (dni z tekstem: ${reconcWithText.length}/${reconc.length}):
${reconcBlock || "(brak wieczornych wpisów)"}

GŁOSÓWKI I WIADOMOŚCI JAKUBA (${voiceEntries.length} wpisów, top 30 po ważności):
${voiceBlock || "(brak głosówek w tym miesiącu)"}`;

      const systemPrompt = `Jesteś Antigravity — prywatny coach Jakuba. Znasz go od środka. Piszesz PO POLSKU, bezpośrednio, na "Ty".
Masz dane CAŁEGO MIESIĄCA — głosówki, reconciliacje wieczorne, sen tygodniami, trening, refleksje tygodniowe, wzorce behawioralne.

TWOJE ZADANIE: Napisz narrację miesiąca. Nie listę statystyk. Historię tego, co naprawdę się działo.

ZASADY (każda jest obowiązkowa):
1. GŁOSÓWKI I RECONCILIACJE to twój główny materiał — cytuj konkretne frazy, podaj daty. To autentyczny głos Jakuba.
2. DYNAMIKA TYGODNIOWA: Jak zmieniał się miesiąc tydzień po tygodniu — energia, sen, PowerList. Gdzie był wzrost, gdzie załamanie.
3. SPRZECZNOŚCI: Co mówił że chce (refleksje, głosówki) vs co zrobił (PowerList Z/P, trening, KPI). Nazwij rozbieżność wprost.
4. WZORCE: Jeśli behavioral patterns z bazy potwierdzają się w danych miesiąca — napisz to. Jeśli zaprzeczają — napisz to.
5. Pomiń oczywiste — nie streszczaj liczb, które AI już widzi. Powiedz coś, czego Jakub sam nie widzi.
6. "longterm_motif": tylko jeśli TEN SAM MOTYW wraca wielokrotnie w różnych danych (głosówka + PowerList + reconciliacja). Null jeśli spekulacja.
7. "question": JEDNO ostre pytanie zakorzenione w KONKRETNYM dniu lub głosówce — nie pytanie ogólne.
8. "theme_suggestion": zaproponuj temat na NASTĘPNY miesiąc — 2-5 słów, konkretny horyzont wynikający z wniosków narracji. Np. "Pipeline przed perfekcją", "Ciało jako fundament", "Refleksja przed działaniem". To jest dla Jakuba propozycja — on może ją zmienić.

Długość narracji: 8-12 zdań.
Zwróć TYLKO JSON: {"narrative": "...", "longterm_motif": "..." | null, "question": "...", "theme_suggestion": "..."}`;

      const { content } = await deepseekChat({
        apiKey,
        ...LLM_TASKS.structured,
        maxTokens: 2500,
        temperature: 0.3,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: factsBlock }]
      });

      const parsed = parseJsonFromContent(content);
      if (!parsed || typeof parsed.narrative !== "string" || typeof parsed.question !== "string") throw new Error(`Invalid AI JSON month: ${content.slice(0, 300)}`);

      const phase1 = {
        narrative: parsed.narrative,
        longterm_motif: typeof parsed.longterm_motif === "string" ? parsed.longterm_motif : null,
        question: parsed.question,
        theme_suggestion: typeof parsed.theme_suggestion === "string" ? parsed.theme_suggestion : null,
      };

      const { data: existing } = await db.from("monthly_reviews").select("ai_recap").eq("user_id", userId).eq("month_start", monthStart).maybeSingle();
      const mergedRecap = { ...(existing?.ai_recap ?? {}), phase1 };
      await db.from("monthly_reviews").upsert({ user_id: userId, month_start: monthStart, ai_recap: mergedRecap }, { onConflict: "user_id,month_start" });

      return { phase1 };
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
        const d = new Date(s.timestamp as string).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw", day: "numeric", month: "short", year: "numeric" });
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
  } catch (err: any) {
    console.error("[vanguard-week-recap] error:", err);
    throw err;
  }
}
