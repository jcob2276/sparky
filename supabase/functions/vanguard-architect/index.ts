/**
 * @function vanguard-architect
 * @trigger HTTP POST / manual / webhook po zapisie streamu
 * @role Budowanie grafu wiedzy: przetwarza wpisy ze strumienia na encje i relacje (vanguard_entity_links).
 * @reads vanguard_stream, entities, vanguard_entity_links, vanguard_daily_aggregates
 * @writes vanguard_entity_links, entities, entity_aliases
 * @calls deepseek-v4-flash
 * @consumer Graf wiedzy (wyświetlany w RAG Wyroczni i Wiki)
 * @status active
 */
import { serveJson } from "../_shared/http.ts"
import { getVanguardUserId } from "../_shared/constants.ts"
import { processRecords } from "./extraction/processor.ts"

Deno.serve(serveJson(async (req, ctx) => {
  const supabase = ctx.supabase

  const { type = "knowledge", offset = 0, limit = 5, record_id = null } = await req.clone().json().catch(() => ({}))
  const userId = getVanguardUserId()
  const table = type === "knowledge" ? "vanguard_knowledge" : "vanguard_stream"

  console.log(`Architect starting: type=${type} offset=${offset} limit=${limit} record_id=${record_id || "none"}`)

  let query = supabase
    .from(table)
    .select("id, content, created_at")
    .eq("user_id", userId)

  if (record_id) {
    query = query.eq("id", record_id).limit(1)
  } else {
    query = query
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1)
  }

  const { data: records, error: fetchError } = await query

  if (fetchError) throw fetchError
  if (!records || records.length === 0) {
    return { message: "No more records", count: 0 }
  }

  const { data: activeLinksRaw, error: activeLinksErr } = await supabase
    .from("vanguard_entity_links")
    .select("id, source_entity, relation, target_entity, weight, confidence_score, metadata, evidence_count")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(150)

  if (activeLinksErr) {
    console.error("[architect] Failed to fetch active links:", activeLinksErr)
  }
  const activeLinks: any[] = activeLinksRaw || []

  const apiKey = Deno.env.get("DEEPSEEK_API_KEY") ?? ""
  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY")

  const { totalTriads, failedUpserts, failedRecords, processedRecords, skippedRecords, rejectedTriads, retryableRecordIds, errors } = await processRecords(
    supabase,
    records,
    activeLinks,
    userId,
    apiKey,
    type
  )

  const success = failedRecords === 0 && failedUpserts === 0
  const receipt = {
    success,
    ...(!success ? { error: 'Batch incomplete; retry failed records' } : {}),
    message: success ? "Batch processed" : "Batch incomplete; retry failed records",
    items_fetched: records.length,
    items_processed: processedRecords,
    items_skipped: skippedRecords,
    triads_accepted: totalTriads,
    // Legacy counter includes merges and accepted RPC calls; it is not an INSERT count.
    triads_created: totalTriads,
    failed_upserts: failedUpserts,
    failed_records: failedRecords,
    rejected_triads: rejectedTriads,
    retryable_record_ids: retryableRecordIds,
    errors,
  }
  return success ? receipt : Response.json(receipt, { status: 503 })
}, { auth: 'service' }))
