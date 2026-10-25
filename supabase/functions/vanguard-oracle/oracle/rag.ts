import { getRecentStrongBehavioralPatterns } from "../../_shared/vanguardPatterns.ts";
import { fetchMedicalContext, formatMedicalContextBlock, formatFlaggedMedicalSummary } from "../../_shared/medicalContext.ts";
import { classifyIntentSafe } from "./ragHelpers.ts";
import { runRagPipeline } from "./ragPipeline.ts";
import { fetchHealthspanContext } from "./healthspanContext.ts";
import { computeHealthSummary, formatStrainContext } from "./healthContextFormatters.ts";
import { fetchDeviceUsageContext, fetchProjectsAndGoalsContext } from "./deviceContext.ts";
import { fetchDayLoopContext } from "./dayLoopContext.ts";
import { fetchHealthCoachContext, formatHealthCoachContext } from '../../_shared/healthCoachContext.ts';
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
    fundamentRes, coachContext, proposalsRes, medicalContext, deviceUsageContext, projectsGoalsContext, lifeTargetsRes,
  ] = await Promise.all([
    supabase.from('user_fundament')
      .select('identity, philosophy, vision')
      .eq('user_id', user_id)
      .maybeSingle(),
    fetchHealthCoachContext({ supabase, userId: user_id }),
    supabase.from('system_proposals')
      .select('title, description:body, category:proposal_type')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .limit(5),
    fetchMedicalContext(supabase, user_id, todayDate).catch(() => null),
    fetchDeviceUsageContext(supabase, user_id),
    fetchProjectsAndGoalsContext(supabase, user_id),
    supabase.from('life_targets').select('bench_goal_kg, income_goal_net_pln').eq('user_id', user_id).maybeSingle(),
  ]);

  if (fundamentRes.error) console.error('[oracle] user_fundament query error:', fundamentRes.error);
  if (proposalsRes.error) console.error('[oracle] system_proposals query error:', proposalsRes.error);

  const sourceRows = (source: keyof typeof coachContext.sources) => coachContext.sources[source].value ?? [];
  const responsePrefs = sourceRows('vanguard_preferences').map(p => `- ${p.value}`).join('\n');
  const recentRows = (source: keyof typeof coachContext.sources) => sourceRows(source).filter(row => String(row.date) >= fourteenDaysAgoDate);
  const { healthSummary14d } = computeHealthSummary(
    recentRows('oura_daily_summary'),
    recentRows('daily_nutrition'),
    recentRows('daily_food_entries'),
    fourteenDaysAgoDate,
    todayDate,
    wantsFullBiometrics,
  );

  const healthSummaryText = formatHealthCoachContext(coachContext);
  const strain14dAll = recentRows('daily_strain');
  const strainText = formatStrainContext(strain14dAll, wantsFullBiometrics, todayDate);

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
    fundament: {
      ...(fundamentRes.data || { identity: '', philosophy: '', vision: '' }),
      targets: formatLifeTargets(lifeTargetsRes.data, sourceRows('nutrition_profile')[0]?.goal_body_fat),
    }
  };
}

/** Cele liczbowe od właścicieli (life_targets, nutrition_profile): tekst wizji w Fundamencie nie jest źródłem liczb. */
function formatLifeTargets(targets: { bench_goal_kg: number | null; income_goal_net_pln: number | null } | null, goalBodyFat: unknown): string | null {
  const parts = [
    goalBodyFat != null && Number(goalBodyFat) > 0 ? `tłuszcz ${Number(goalBodyFat)}%` : null,
    targets?.bench_goal_kg ? `wyciskanie ${targets.bench_goal_kg} kg (e1RM)` : null,
    targets?.income_goal_net_pln ? `dochód ${targets.income_goal_net_pln} zł netto / msc` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}
