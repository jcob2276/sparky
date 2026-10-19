import { getWarsawDateString } from "../../_shared/time.ts"
import { deepseekChat, parseJsonFromContent } from "../../_shared/deepseek.ts"
import { LLM_TASKS } from "../../_shared/llm/tasks.ts"
import { getAggregateByDate } from "../../_shared/repos/aggregatesRepo.ts"
import { normalizeText } from "./helpers.ts"
import { deterministicTriads } from "./rules.ts"
import { buildExtractionPrompt } from "./prompt.ts"
import { validateTriad } from "./validation.ts"

export async function processRecords(
  supabase: any,
  records: any[],
  activeLinks: any[],
  userId: string,
  apiKey: string,
  type: string
) {
  let totalTriads = 0
  let failedUpserts = 0
  let failedRecords = 0
  let processedRecords = 0
  let skippedRecords = 0
  let rejectedTriads = 0
  const retryableRecordIds: string[] = []
  const errors: Array<{ record_id: string; reason: string }> = []
  let currentActiveLinks = [...activeLinks]

  for (const [recordIndex, record] of records.entries()) {
    if (typeof record.content !== 'string' || !record.content.trim()) { skippedRecords++; continue }

    const recordDate = getWarsawDateString(new Date(record.created_at))
    let dailyBio = null
    try {
      dailyBio = await getAggregateByDate(supabase, userId, recordDate)
    } catch (dailyBioErr) {
      console.error(`[architect] daily aggregate query error for date ${recordDate}:`, dailyBioErr)
    }
    const activeLinksText = currentActiveLinks
      .map((l: any) => `- (${l.source_entity}) --(${l.relation})--> (${l.target_entity}) [confidence: ${l.confidence_score}]`)
      .join("\n")

    const systemPrompt = buildExtractionPrompt(activeLinksText)

    let contextRefreshFailed = false
    try {
      const failuresBefore = failedUpserts
      const { content: raw, finishReason } = await deepseekChat({
        apiKey,
        ...LLM_TASKS.classify,
        maxTokens: 2200,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `[BIOMETRIA_Z_DNIA]: ${JSON.stringify(dailyBio || null)}\n[TEKST]: ${record.content.slice(0, 6000)}`,
          },
        ],
      })

      if (finishReason === 'length') throw new Error('Incomplete extraction: token limit reached')
      const parsed = parseJsonFromContent(raw)
      if (!parsed || !Array.isArray(parsed.triads)) throw new Error('Invalid extraction: expected triads array')
      const llmTriads = parsed.triads
      const fallbackTriads = deterministicTriads(record.content)
      const validTriads = [...llmTriads, ...fallbackTriads].flatMap((candidate) => {
        const triad = validateTriad(candidate, record.content.slice(0, 6000))
        if (!triad) rejectedTriads++
        return triad ? [triad] : []
      })
      const triads = validTriads.filter((triad, index, all) =>
        index === all.findIndex((other) =>
          other.source === triad.source &&
          other.relation === triad.relation &&
          other.target === triad.target
        )
      )

      for (const triad of triads) {
        const conflictingLink = triad.resolution?.conflicting_link
        const superseded = triad.resolution?.action === 'supersede' && conflictingLink
          ? currentActiveLinks.find((l: any) =>
            normalizeText(l.source_entity) === normalizeText(conflictingLink.source) &&
            l.relation === conflictingLink.relation &&
            normalizeText(l.target_entity) === normalizeText(conflictingLink.target)
          )
          : null
        // One transaction owns insert, merge, dedupe and supersession. Never retire
        // the previous fact before the replacement is durably accepted.
          const { error: upsertError } = await supabase.rpc("upsert_vanguard_entity_link", {
            p_user_id: userId,
            p_source: triad.source,
            p_source_type: triad.source_type || "concept",
            p_relation: triad.relation,
            p_target: triad.target,
            p_target_type: triad.target_type || "concept",
            p_confidence_score: triad.confidence_score,
            p_memory_type: triad.memory_type || "fact",
            p_layer: "intelligence",
            p_metadata: {
              source: "vanguard_architect",
              input_type: type,
              source_record_id: record.id,
              ...(superseded?.id ? { supersedes_link_id: superseded.id } : {}),
              ...(!superseded?.id && superseded
                && normalizeText(superseded.source_entity) === normalizeText(triad.source)
                && superseded.relation === triad.relation
                ? { supersedes_target: superseded.target_entity } : {}),
              ...(triad.evidence_quote ? { evidence_quote: triad.evidence_quote } : {}),
              ...(triad.keywords ? { keywords: triad.keywords } : {}),
            },
            p_observed_at: record.created_at,
            p_source_episode_id: record.id,
          })

          if (upsertError) {
            failedUpserts++
            console.error("Architect graph upsert error:", upsertError)
          } else {
            totalTriads++
            // A successful void RPC may insert, dedupe or retain a backdated fact.
            // Only persisted rows establish IDs and the next conflict context.
            contextRefreshFailed = true
            const { data: active, error: refreshError } = await supabase.from('vanguard_entity_links')
              .select('id, source_entity, relation, target_entity, weight, confidence_score, metadata, evidence_count')
              .eq('user_id', userId).eq('status', 'active').limit(150)
            if (refreshError || !Array.isArray(active)) throw new Error('Active graph context refresh failed')
            currentActiveLinks = active
            contextRefreshFailed = false
          }
      }
      processedRecords++
      if (failedUpserts > failuresBefore) {
        failedRecords++
        retryableRecordIds.push(record.id)
        errors.push({ record_id: record.id, reason: 'graph_write_failed' })
      }
    } catch (error) {
      console.error("Error processing record in Architect:", error)
      failedRecords++
      retryableRecordIds.push(record.id)
      errors.push({ record_id: record.id, reason: contextRefreshFailed ? 'context_refresh_failed'
        : error instanceof Error && error.message.includes('token limit') ? 'incomplete_extraction' : 'extraction_failed' })
      if (contextRefreshFailed) {
        for (const pending of records.slice(recordIndex + 1)) {
          if (typeof pending.content !== 'string' || !pending.content.trim()) { skippedRecords++; continue }
          failedRecords++
          retryableRecordIds.push(pending.id)
          errors.push({ record_id: pending.id, reason: 'context_unavailable' })
        }
        break
      }
    }
  }

  return {
    totalTriads,
    failedUpserts,
    failedRecords,
    processedRecords,
    skippedRecords,
    rejectedTriads,
    retryableRecordIds,
    errors,
  }
}
