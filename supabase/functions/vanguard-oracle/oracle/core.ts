import { isJevAvailable, jevDecide } from "../../_shared/jev.ts";
/**
 * Oracle core logic — no Deno.serve() side-effect, safe to import.
 *
 * This module contains all Oracle query-processing logic extracted from
 * vanguard-oracle/index.ts. The entrypoint (index.ts) is a thin Deno.serve
 * wrapper that delegates here.
 *
 * If you need to call Oracle logic from another edge function (e.g.
 * vanguard-eval-interview), import runOracleQuery from this file —
 * NOT from index.ts (which carries Deno.serve as a module-level side-effect).
 */
import { deepseekChat, parseJsonFromContent } from "../../_shared/deepseek.ts";
import { LLM_TASKS } from "../../_shared/llm/tasks.ts";
import type { DeepSeekMessage } from "../../_shared/deepseek.ts";
import { z } from "npm:zod";
import { runOracleReadonlyQuery } from "../../_shared/oracleSql.ts";
import { sanitizeStateVector, sanitizeUserConf, sanitizeUserQuery, todayPlanFromWorldState } from "../../_shared/promptSanitize.ts";
import { getStreamCutoffs, getWarsawDateString } from "../../_shared/time.ts";
import { compressHistoryIfNeeded } from "../../_shared/contextCompression.ts";
import { retrieveRagContext } from "./rag.ts";
import { buildSystemPrompt } from "./systemPrompt.ts";
import { fetchWorldState } from "../../_shared/worldState.ts";
import { logOracleRun, processOracleMutations } from "./mutations.ts";
import { buildSqlTool } from "./sqlTool.ts";
import { extractAllSqlFromDsml, containsDsmlToolMarkup, stripDsmlMarkup } from "./dsmlSqlExtract.ts";
import { OracleResponseSchema, extractAnswer } from "./responseExtract.ts";
import { handleStreamingResponse } from "./streamHandler.ts";
import { handleNoteSummary, handleExtractTasks } from "../handlers/noteOps.ts";
import { getCircadianStance } from "./circadian.ts";
import { fetchCoreMemory, applyCoreMemoryMutation } from "./coreMemory.ts";

const MAX_SQL_TOOL_ITERATIONS = 3;

export interface OracleRequestBody {
  state_vector?: unknown;
  history?: Array<{ role: string; content: string }>;
  current_query?: string;
  user_id?: string;
  mode?: string;
  thinking?: boolean;
  agent_run_mode?: string;
  user_conf?: unknown;
  override_date?: string;
  stream?: boolean;
  resolved_claims?: string;
  content?: string;
  title?: string;
}

/**
 * Core Oracle query handler. Called by the HTTP entrypoint (index.ts) and
 * can be imported directly by other edge functions without pulling in
 * Deno.serve().
 */
// deno-lint-ignore no-explicit-any
export async function runOracleQuery(
  supabase: any,
  user_id: string,
  body: OracleRequestBody,
  req: Request,
): Promise<Record<string, unknown> | Response> {
  const t0 = Date.now();

  const {
    history, current_query, mode = "chat", thinking = false,
    agent_run_mode = "auto", user_conf, override_date, stream, resolved_claims,
    content: noteContent, title: noteTitle,
  } = body;

  if (mode === "note_summary") return await handleNoteSummary(user_id, noteTitle, noteContent);
  if (mode === "extract_tasks") return await handleExtractTasks(user_id, noteTitle, noteContent);

  const now = override_date ? new Date(`${override_date}T12:00:00Z`) : new Date();
  const localTimeString = override_date
    ? `${override_date} 12:00:00 (BACKTEST)`
    : now.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
  const { cut72h: cutoff72h } = getStreamCutoffs(now);
  const fourteenDaysAgoDate = getWarsawDateString(new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000));
  const todayDate = getWarsawDateString(now);

  const actualStateVector = await fetchWorldState(supabase, user_id, todayDate, now.getTime());
  const safeStateVector = sanitizeStateVector(actualStateVector);
  const todayPlan = todayPlanFromWorldState(safeStateVector);
  const safeUserConf = sanitizeUserConf(user_conf);
  console.log(`[oracle] start | user: ${user_id} | query: "${current_query?.substring(0, 50)}..."`);

  // --- SYSTEM ONE MIDDLEWARE (JEV-1.13.0 DECISION GATE) ---
  let jevIntervention = "";
  if (isJevAvailable() && mode === "chat" && current_query && current_query.length > 15) {
    try {
      const jevState = {
        user_query: sanitizeUserQuery(current_query),
        today_plan: todayPlan,
        friction_events: (safeStateVector as any)?.friction_events_72h || [],
        oura_readiness: (safeStateVector as any)?.biometrics?.oura_last_night?.score || null,
      };

      const jevResult = await jevDecide({
        state: jevState,
        questions: {
          intent: {
            type: "choice",
            instructions: "Sklasyfikuj główną intencję użytkownika.",
            criteria: {
              information_request: "Użytkownik pyta o fakty, analizy, wiedzę lub podsumowanie.",
              planning: "Użytkownik ustala plan na dzisiaj/jutro.",
              avoidance_rationalization: "Użytkownik racjonalizuje nierobienie zadań, ucieka przed pracą (np. porno, lenie) lub zgłasza status, który budzi podejrzenia (fałszywe logi).",
              day_closure: "Użytkownik robi wieczorne podsumowanie dnia."
            }
          },
          is_lying_about_execution: {
            type: "noul",
            instructions: "Prawdopodobieństwo, że użytkownik twierdzi, że wykonał ciężką pracę/trening, ale dane obiektywne (np. 1300 kroków z Oury) temu przeczą."
          },
          friction_level: {
            type: "score",
            instructions: "Oceń poziom tarcia/unikania w wiadomości użytkownika (1 - luz, 5 - twardy sabotaż).",
            criteria: ["1", "2", "3", "4", "5"]
          }
        }
      });

      const ansIntent = jevResult.answers.intent;
      const ansLying = jevResult.answers.is_lying_about_execution;

      if (
        ansIntent?.type === 'choice' &&
        ansLying?.type === 'noul' &&
        ansIntent.choice === 'avoidance_rationalization' &&
        ansLying.noul > 0.85
      ) {
        console.log(`[oracle] JEV GATE TRIGGERED: avoidance_rationalization + lie_probability=${ansLying.noul}`);
        
        const shortMsg = `🔴 **[SYSTEM ONE OVERRIDE]**\n\nSystem wykrył racjonalizację i próbę zafałszowania stanu (prawdopodobieństwo: ${Math.round(ansLying.noul * 100)}%).\nZablokowano generowanie wypracowania i warstwę psychologiczną.\n\nMasz przed sobą jeden konkretny mikrokrok. Wykonaj go i zamelduj. Koniec dyskusji.`;
        
        if (stream) {
          const streamObj = new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: shortMsg })}\n\n`));
              const finalData = {
                answer: shortMsg,
                intent_confirmed: 'avoidance_confrontation',
                should_respond: true,
                oracle_system_proposals: []
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ _final: finalData })}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            }
          });
          return new Response(streamObj, { headers: { "Content-Type": "text/event-stream" } });
        } else {
          return {
            answer: shortMsg,
            intent_confirmed: 'avoidance_confrontation',
            oracle_system_proposals: []
          };
        }
      }
      
      if (ansIntent?.type === 'choice') {
        jevIntervention = `\n\n[SYSTEM ONE JEV CLASSIFICATION]\nIntent: ${ansIntent.choice}\nLying Probability: ${ansLying?.type === 'noul' ? ansLying.noul : 'N/A'}`;
      }
    } catch (err) {
      console.warn("[oracle] Jev middleware failed or timed out:", err);
    }
  }
  // --- END SYSTEM ONE MIDDLEWARE ---

  const rag = await retrieveRagContext(supabase, user_id, current_query, todayDate, fourteenDaysAgoDate, mode, cutoff72h);
  const coreMemory = await fetchCoreMemory(supabase, user_id);

  const stateVectorObj = typeof safeStateVector === "object" && safeStateVector !== null
    ? (safeStateVector as Record<string, unknown>)
    : undefined;
  const biometricsObj = typeof stateVectorObj?.biometrics === "object" && stateVectorObj.biometrics !== null
    ? (stateVectorObj.biometrics as Record<string, unknown>)
    : undefined;
  const ouraInfo = typeof biometricsObj?.oura_last_night === "object" && biometricsObj.oura_last_night !== null
    ? (biometricsObj.oura_last_night as Record<string, unknown>)
    : undefined;
  const readinessScore = typeof ouraInfo?.readiness === "number" ? ouraInfo.readiness : undefined;
  const sleepHours = typeof ouraInfo?.sleep_hours === "number" ? ouraInfo.sleep_hours : undefined;

  const warsawHour = parseInt(localTimeString.slice(11, 13), 10) || new Date().getUTCHours() + 2;
  const circadian = getCircadianStance(warsawHour, readinessScore, sleepHours);
  const circadianContextText = `${circadian.headline}\n${circadian.instructions}${circadian.biometricWarning ? '\n' + circadian.biometricWarning : ''}`;

  const systemPrompt = buildSystemPrompt({
    agent_run_mode, mode, fundament: rag.fundament, responsePrefs: rag.responsePrefs,
    todayPlan,
    recentPlanQuality: rag.recentPlanQuality, lastEveningReflection: rag.lastEveningReflection,
    ironRulesContext: rag.ironRulesContext, behavioralPatternsContext: rag.behavioralPatternsContext,
    intent: rag.intent, clarificationsContext: rag.clarificationsContext,
    healthSummaryText: rag.healthSummaryText, strainText: rag.strainText,
    medicalContextText: rag.medicalContextText, healthspanContextText: rag.healthspanContextText, semanticContext: rag.semanticContext,
    graphContext: resolved_claims ? `${resolved_claims}\n\n${rag.graphContext}` : rag.graphContext,
    wikiContext: rag.wikiContext, localTimeString, safeUserConf, safeStateVector,
    circadianContextText, coreMemory,
    deviceUsageContext: rag.deviceUsageContext,
    projectsGoalsContext: rag.projectsGoalsContext,
    dayLoopContextText: rag.dayLoopContextText,
  });

  const compressedHistory = await compressHistoryIfNeeded(history || []);
  const wasCompressed =
    compressedHistory.length > 0 &&
    compressedHistory[0].role === "system" &&
    compressedHistory[0].content.startsWith("[SKOMPRESOWANA HISTORIA]");
  if (jevIntervention) current_query += jevIntervention;
  const messages: DeepSeekMessage[] = [
    { role: "system", content: systemPrompt },
    ...compressedHistory.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    })),
  ];

  if (current_query) {
    messages.push({ role: "user", content: sanitizeUserQuery(current_query) });
  }

  if (stream) {
    return await handleStreamingResponse(messages, {
      supabase, user_id, current_query: current_query ?? "", rag, thinking, agent_run_mode,
      wasCompressed, compressedHistory, t0,
    });
  }

  // --- NON-STREAMING PATH ---
  console.log(`[oracle] deepseek start`, Date.now() - t0);

  let structuredResponse: z.infer<typeof OracleResponseSchema>;
  let rawOutput = "";
  try {
    const toolMessages: DeepSeekMessage[] = [...messages];
    let iterations = 0;
    let chatRes;

    while (true) {
      const offerTools = !thinking && iterations < MAX_SQL_TOOL_ITERATIONS;
      chatRes = await deepseekChat({
        apiKey: Deno.env.get("DEEPSEEK_API_KEY") ?? "",
        ...(thinking ? LLM_TASKS.deep : LLM_TASKS.oracle),
        messages: toolMessages,
        temperature: thinking ? null : 0.7,
        maxTokens: null,
        responseFormat: undefined,
        tools: offerTools ? [buildSqlTool()] : undefined,
        timeoutMs: 25000,
      });

      if (offerTools && chatRes.tool_calls && chatRes.tool_calls.length > 0) {
        iterations++;
        toolMessages.push({ role: "assistant", content: chatRes.content || "", tool_calls: chatRes.tool_calls });
        for (const tc of chatRes.tool_calls) {
          let sql = "";
          try { sql = JSON.parse(tc.function.arguments)?.sql || ""; } catch { /* handled below */ }
          const result = sql
            ? await runOracleReadonlyQuery(supabase, user_id, sql)
            : { ok: false as const, error: 'Missing or invalid "sql" argument' };
          console.log(
            `[oracle] sql tool call #${iterations}:`, sql.slice(0, 200),
            "->", result.ok ? `${result.rows.length} rows` : `error: ${result.error}`,
          );
          toolMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result.ok ? result.rows : { error: result.error }) });
        }
        continue;
      }

      // v4-flash sometimes emits DSML tool XML in content instead of tool_calls
      const sqlFromDsml = offerTools ? extractAllSqlFromDsml(chatRes.content || "") : [];
      if (offerTools && sqlFromDsml.length > 0) {
        iterations++;
        toolMessages.push({ role: "assistant", content: chatRes.content || "" });

        const queryResults = [];
        for (const sql of sqlFromDsml) {
          const result = await runOracleReadonlyQuery(supabase, user_id, sql);
          queryResults.push(result.ok ? result.rows : { error: result.error });
          console.log(
            `[oracle] dsml sql tool call #${iterations}:`, sql.slice(0, 200),
            "->", result.ok ? `${result.rows.length} rows` : `error: ${result.error}`,
          );
        }

        toolMessages.push({
          role: "user",
          content: `[Wynik query_database]\n${JSON.stringify(queryResults.length === 1 ? queryResults[0] : queryResults)}\n\nKontynuuj odpowiedź po polsku. Nie używaj DSML ani surowego SQL — zwykły tekst lub JSON z polem "answer".`,
        });
        continue;
      }

      break;
    }

    if (!chatRes!.content?.trim() && !chatRes!.reasoning_content?.trim()) {
      console.warn("[oracle] DeepSeek returned empty content, retrying once");
      chatRes = await deepseekChat({
        apiKey: Deno.env.get("DEEPSEEK_API_KEY") ?? "",
        ...(thinking ? LLM_TASKS.deep : LLM_TASKS.oracle),
        messages: toolMessages,
        temperature: thinking ? null : 0.7,
        maxTokens: null,
        responseFormat: undefined,
        timeoutMs: 25000,
      });
    }
    rawOutput = chatRes!.content?.trim() || chatRes!.reasoning_content?.trim() || "";
    if (containsDsmlToolMarkup(rawOutput)) {
      const stripped = stripDsmlMarkup(rawOutput);
      rawOutput = stripped && !/^\s*(SELECT|WITH)\b/i.test(stripped)
        ? stripped
        : "Nie udało się wykonać zapytania do bazy. Spróbuj ponownie.";
    }
    const reasoning_content = chatRes!.reasoning_content;
    console.log(`[oracle] deepseek done`, Date.now() - t0);

    const parsedObj = parseJsonFromContent(rawOutput) || {};
    const validation = OracleResponseSchema.safeParse(parsedObj);

    if (!validation.success) {
      console.warn("[oracle] Zod validation failed, using raw output as fallback. Error:", validation.error.message);
      structuredResponse = {
        answer: rawOutput.trim() || "Nie udało się poprawnie zinterpretować odpowiedzi.",
        confidence: "low", intent_confirmed: rag.intent, claims: [],
      };
    } else {
      structuredResponse = validation.data;
      if (!structuredResponse.answer && !structuredResponse.text && rawOutput.trim() && Object.keys(parsedObj).length === 0) {
        structuredResponse.answer = rawOutput.trim();
      }
    }

    if (reasoning_content) console.log("[oracle] Extracted reasoning_content length:", reasoning_content.length);
  } catch (e) {
    console.error("DeepSeek response failed:", e);
    throw e;
  }

  const text = extractAnswer(structuredResponse, rawOutput);

  await logOracleRun(supabase, {
    user_id, query: current_query || "", intent: structuredResponse.intent_confirmed || rag.intent,
    answer: text, confidence: structuredResponse.confidence || "medium",
    claims: structuredResponse.claims || [], sources: rag.retrievedSources,
    retrieved_context: { semantic: rag.matchesRes.data || [], graph: rag.graphRes.data || [], health_14d: rag.healthSummary14d },
    state_vector: safeStateVector,
  });

  const pendingAction = await processOracleMutations(
    supabase,
    user_id,
    structuredResponse,
    agent_run_mode,
  );

  if (structuredResponse.core_memory_mutation && agent_run_mode !== 'readOnly') {
    await applyCoreMemoryMutation(supabase, user_id, structuredResponse.core_memory_mutation).catch((e) => {
      console.error("[oracle] core_memory_mutation failed:", e);
    });
  }

  console.log(`[oracle] response returned`, Date.now() - t0);
  return {
    ...structuredResponse, text, sources: rag.retrievedSources,
    intent_confirmed: structuredResponse.intent_confirmed || rag.intent,
    compressed_history: wasCompressed ? compressedHistory : undefined,
    pending_action: pendingAction || undefined,
  };
}

