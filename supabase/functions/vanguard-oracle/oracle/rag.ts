import { getRecentStrongBehavioralPatterns } from "../../_shared/vanguardPatterns.ts";
import { fetchMedicalContext, formatMedicalContextBlock, formatFlaggedMedicalSummary } from "../../_shared/medicalContext.ts";
import { classifyIntentSafe } from "./ragHelpers.ts";
import { runRagPipeline } from "./ragPipeline.ts";
import { fetchHealthspanContext } from "./healthspanContext.ts";
import { computeHealthSummary, formatStrainContext } from "./healthContextFormatters.ts";
import { fetchDeviceUsageContext, fetchProjectsAndGoalsContext } from "./deviceContext.ts";
import { fetchDayLoopContext } from "./dayLoopContext.ts";
export async function retrieveRagContext(
  supabase: any,
  user_id: string,
  current_query: string | null | undefined,
  todayDate: string,
  fourteenDaysAgoDate: string,
  mode: string,
  cutoff72h: string,
) {
  const dayLoop = await fetchDayLoopContext(supabase, user_id, todayDate);
  const recentPlanQuality = dayLoop.recentPlanQuality;
  const lastEveningReflection = dayLoop.lastEveningReflection;
  const intent = classifyIntentSafe(current_query || '');
  const wantsFullBiometrics = intent === 'biometric';
  const wantsMedical = wantsFullBiometrics ||
    /\b(badani|krew|lab|marker|cholesterol|ferrytyn|witamin|morpholog|glukoz|hemoglob|zdrow|tsh|ft3|leukocyt|erytrocyt|żelazo|zelazo)\w*/i.test(current_query || '');
  const wantsClarifications = intent === 'identity' ||
    /\b(pamiętasz|pamietasz|mówiłeś|mowiles|odpowiadałeś|pytałeś|preferenc)\w*/i.test(current_query || '');

  const [
    fundamentRes, preferencesRes, oura14dRes, nutrition14dRes, foodEntries14dRes,
    strainRes, proposalsRes, medicalContext, deviceUsageContext, projectsGoalsContext,
  ] = await Promise.all([
    supabase.from('user_fundament')
      .select('identity, philosophy, vision')
      .eq('user_id', user_id)
      .maybeSingle(),
    supabase.from('vanguard_preferences')
      .select('value')
      .eq('user_id', user_id)
      .eq('is_active', true),
    supabase.from('oura_daily_summary')
      .select('date, steps, active_calories, total_calories, total_sleep_hours, bedtime_timestamp, readiness_score, hrv_avg, rhr_avg, deep_sleep_hours, rem_sleep_hours, sleep_efficiency, latency_minutes')
      .eq('user_id', user_id)
      .gte('date', fourteenDaysAgoDate)
      .order('date', { ascending: false }),
    supabase.from('daily_nutrition')
      .select('date, calories, protein, carbs, fat, fiber, sugar, avg_food_quality, food_quality_analysis')
      .eq('user_id', user_id)
      .gte('date', fourteenDaysAgoDate)
      .order('date', { ascending: false }),
    supabase.from('daily_food_entries')
      .select('date, meal_type, name, brand, calories, protein, carbs, fat, fiber, sugar, saturated_fat, insulin_load, food_quality_score, quality_reason')
      .eq('user_id', user_id)
      .gte('date', fourteenDaysAgoDate)
      .order('date', { ascending: false }),
    supabase.from('daily_strain')
      .select('date, strain_score, recovery_score, fueling_score, fueling_provisional, mental_load_score, daily_status, main_limiter, explanation, cardio_load, strength_load, leg_load, cns_load')
      .eq('user_id', user_id)
      .gte('date', fourteenDaysAgoDate)
      .order('date', { ascending: false }),
    supabase.from('system_proposals')
      .select('title, description, category')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .limit(5),
    fetchMedicalContext(supabase, user_id, todayDate).catch(() => null),
    fetchDeviceUsageContext(supabase, user_id),
    fetchProjectsAndGoalsContext(supabase, user_id),
  ]);

  if (fundamentRes.error) console.error('[oracle] user_fundament query error:', fundamentRes.error);
  if (preferencesRes.error) console.error('[oracle] vanguard_preferences query error:', preferencesRes.error);
  if (oura14dRes.error) console.error('[oracle] oura_daily_summary query error:', oura14dRes.error);
  if (nutrition14dRes.error) console.error('[oracle] daily_nutrition query error:', nutrition14dRes.error);
  if (foodEntries14dRes.error) console.error('[oracle] daily_food_entries query error:', foodEntries14dRes.error);
  if (strainRes.error) console.error('[oracle] daily_strain query error:', strainRes.error);
  if (proposalsRes.error) console.error('[oracle] system_proposals query error:', proposalsRes.error);

  const responsePrefs = preferencesRes.data?.map((p: any) => `- ${p.value}`).join('\n') || '';
  const { healthSummary14d, healthSummaryText } = computeHealthSummary(
    oura14dRes.data || [],
    nutrition14dRes.data || [],
    foodEntries14dRes.data || [],
    fourteenDaysAgoDate,
    todayDate,
    wantsFullBiometrics,
  );

  const strain14dAll = strainRes.data || [];
  const strainText = formatStrainContext(strain14dAll, wantsFullBiometrics);

  const medicalContextText = medicalContext
    ? (wantsMedical ? formatMedicalContextBlock(medicalContext) : formatFlaggedMedicalSummary(medicalContext))
    : '';
  const healthspanContextText = await fetchHealthspanContext(supabase, user_id);
  // DYNAMIC CONTEXT (RAG) - DETERMINISTIC 3-STEP PIPELINE
  let semanticContext = "";
  let graphContext = "";
  let wikiContext = "";
  let retrievedSources: any[] = [];
  let matchesRes: any = { data: [] };
  let graphRes: any = { data: [] };

  if (current_query) {
    const ragResult = await runRagPipeline(supabase, user_id, current_query, intent, cutoff72h, proposalsRes);
    semanticContext = ragResult.semanticContext;
    graphContext = ragResult.graphContext;
    retrievedSources = ragResult.retrievedSources;
    matchesRes = ragResult.matchesRes;
    graphRes = ragResult.graphRes;
  }

  // WIKI CONTEXT
  try {
    const wikiTypes = intent === 'biometric'
      ? ['health', 'training', 'operating_model']
      : intent === 'person'
        ? ['person', 'identity', 'operating_model']
        : intent === 'recent_pattern'
          ? ['behavior_pattern', 'friction_loop', 'operating_model']
          : ['operating_model', 'behavior_pattern', 'identity', 'project', 'decision'];

    const { data: wikiPages, error: wikiErr } = await supabase
      .from('vanguard_wiki_pages')
      .select('id, slug, title, page_type, status, confidence, summary, content_md, source_refs, last_compiled_at')
      .eq('user_id', user_id)
      .in('page_type', wikiTypes)
      .in('status', ['active', 'user_confirmed', 'hypothesis', 'needs_review'])
      .order('confidence', { ascending: false })
      .order('last_compiled_at', { ascending: false })
      .limit(4);

    if (wikiErr) throw wikiErr;
    if (wikiPages?.length) {
      wikiContext = "\n[VANGUARD WIKI - SKOMPILOWANA PAMIEC, WARSTWA POCHODNA]:\n" +
        wikiPages.map((p: any) => {
          const refs = Array.isArray(p.source_refs)
            ? p.source_refs.slice(0, 3).map((r: any) => `${r.table}:${r.id}`).join(', ')
            : '';
          const detail = p.status === 'needs_review' && intent === 'recent_pattern' && p.content_md
            ? ` | evidence: ${String(p.content_md).replace(/\s+/g, ' ').slice(0, 520)}`
            : '';
          return `- ${p.title} (${p.page_type}, ${p.status}, conf=${Math.round(Number(p.confidence || 0) * 100)}%): ${p.summary}${detail}${refs ? ` | refs: ${refs}` : ''}`;
        }).join('\n') +
        "\nZasada: wiki jest synteza pochodna. Status needs_review = indeks/nawigacja, nie mocna teza. Gdy swiezy stream 72h przeczy wiki, priorytet ma swiezy stream albo oznacz konflikt.";

      retrievedSources.push(...wikiPages.slice(0, 4).map((p: any) => ({
        table: 'vanguard_wiki_pages',
        id: p.id,
        date: p.last_compiled_at,
        type: 'compiled_wiki',
        snippet: `${p.title}: ${p.summary}`,
        confidence_score: p.confidence,
        status: p.status,
      })));
    }
  } catch (e) {
    console.warn('[oracle] wiki context fetch failed (non-fatal):', e);
  }

  // BEHAVIORAL PATTERNS CONTEXT
  let behavioralPatternsContext = '';
  const wantsPatterns = intent === 'recent_pattern' ||
    /\b(wzorzec|schemat|powtarza|powtarzaln|trend|dlaczego znowu|co się dzieje z|ostatnio mam problem|często|zawsze|kiedy|historia|historycznie)\b/.test((current_query || '').toLowerCase());

  if (wantsPatterns) {
    try {
      const strongPatterns = await getRecentStrongBehavioralPatterns(supabase, user_id, 3);
      if (strongPatterns.length > 0) {
        behavioralPatternsContext = strongPatterns
          .map((p, i) => `${i + 1}. ${p.evidence_text} (N=${p.occurrence_count}, pewność=${Math.round(p.confidence * 100)}%)`)
          .join('\n');
      }
    } catch (e) {
      console.warn('[oracle] getRecentStrongBehavioralPatterns failed (non-fatal):', e);
    }
  }

  // IRON RULES CONTEXT
  let ironRulesContext = '';
  try {
    const { data: ironRules } = await supabase
      .from('vanguard_iron_rules')
      .select('rule_text')
      .eq('user_id', user_id)
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .limit(5);
    if (ironRules && ironRules.length > 0) {
      ironRulesContext = ironRules.map((r: { rule_text: string }) => `- ${r.rule_text}`).join('\n');
    }
  } catch (e) {
    console.warn('[oracle] iron_rules fetch failed (non-fatal):', e);
  }

  // CLARIFICATIONS CONTEXT — gated
  let clarificationsContext = '';
  if (wantsClarifications) {
    try {
      const { data: answeredClarifications } = await supabase
        .from('oracle_clarification_requests')
        .select('question, answer, proposed_memory, answered_at')
        .eq('user_id', user_id)
        .eq('status', 'answered')
        .order('answered_at', { ascending: false })
        .limit(8);
      if (answeredClarifications?.length) {
        clarificationsContext = answeredClarifications.map((c: { question: string; answer: unknown; proposed_memory?: string }) =>
          `P: ${c.question}\nO: ${JSON.stringify(c.answer)}${c.proposed_memory ? `\nPamięć: ${c.proposed_memory}` : ''}`
        ).join('\n\n');
      }
    } catch (e) {
      console.warn('[oracle] clarifications fetch failed (non-fatal):', e);
    }
  }

  return {
    responsePrefs,
    healthSummary14d,
    healthSummaryText,
    strainText,
    medicalContextText,
    healthspanContextText,
    semanticContext,
    graphContext,
    wikiContext,
    behavioralPatternsContext,
    ironRulesContext,
    clarificationsContext,
    retrievedSources,
    matchesRes,
    graphRes,
    intent,
    recentPlanQuality,
    lastEveningReflection,
    deviceUsageContext,
    projectsGoalsContext,
    dayLoopContextText: dayLoop.dayLoopContextText,
    fundament: fundamentRes.data || { identity: '', philosophy: '', vision: '' }
  };
}
