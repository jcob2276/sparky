import { chunkText, embed, sha256 } from "./captureHelpers.ts";
import { insertStreamRecord } from "../_shared/repos/streamRepo.ts";

const MAX_ARCHITECT_CHUNKS = 3;

/**
 * Vault writes only to the evidence stream. Graph edges are extracted later by
 * `vanguard-architect` from those stream chunks — never here.
 */
export async function handleVaultIngest(
  db: any,
  userId: string,
  text: string,
  category: string,
  openaiKey: string,
): Promise<unknown> {
  console.log(`[capture/vault-ingest] user=${userId} category=${category} chars=${text.length}`);

  const rawHash = await sha256(`${userId}:${category}:${text}`);
  const { data: existingRawEvent } = await db
    .from("vanguard_raw_events")
    .select("id")
    .eq("user_id", userId)
    .eq("raw_hash", rawHash)
    .maybeSingle();

  let rawEventId = existingRawEvent?.id ?? null;
  if (existingRawEvent) {
    console.log(`[capture/vault-ingest] duplicate raw_hash, skipping stream insert: ${rawEventId}`);
    return {
      success: true,
      duplicate: true,
      raw_event_id: rawEventId,
      chunks: 0,
      message: "Ten vault log byl juz zaimportowany; pominieto duplikat.",
    };
  }

  const { data: rawInserted, error: rawInsertError } = await db.from("vanguard_raw_events").insert({
    user_id: userId,
    source: "identity_vault",
    event_type: "vault_log",
    raw_text: text,
    raw_hash: rawHash,
    payload: { text },
    metadata: {
      category,
      char_count: text.length,
      word_count: text.trim().split(/\s+/).length,
    },
    occurred_at: new Date().toISOString(),
    processing_status: "processed",
  }).select("id").single();

  if (rawInsertError) throw rawInsertError;
  rawEventId = rawInserted?.id ?? null;

  const chunks = chunkText(text);
  let streamCount = 0;
  const streamIds: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = openaiKey ? await embed(chunk, openaiKey) : null;

    const inserted = await insertStreamRecord(db, {
      user_id: userId,
      source: "identity_vault",
      classification: category,
      content: chunk,
      embedding,
      metadata: {
        category,
        chunk_index: i,
        total_chunks: chunks.length,
        ingested_at: new Date().toISOString(),
        raw_event_id: rawEventId,
      },
    });
    streamIds.push(inserted.id);
    streamCount++;
  }

  // Graf powstaje tylko w vanguard-architect (jedyny pisarz). Nic innego nie uruchamia go dla Vaultu,
  // więc wskazujemy mu pierwsze świeże fragmenty; reszta czeka na ręczny/zbiorczy przebieg.
  const architectResults = await Promise.allSettled(
    streamIds.slice(0, MAX_ARCHITECT_CHUNKS).map((recordId) =>
      db.functions.invoke("vanguard-architect", { body: { type: "stream", record_id: recordId, limit: 1 } })
    ),
  );
  for (const result of architectResults) {
    if (result.status === "rejected") console.warn("[capture/vault-ingest] architect invoke failed:", result.reason);
    else if (result.value?.error) console.warn("[capture/vault-ingest] architect invoke failed:", result.value.error);
  }

  return {
    success: true,
    chunks: streamCount,
    message: `Wgrano ${streamCount} chunkow do strumienia. Krawedzie grafu wyciaga vanguard-architect.`,
  };
}
