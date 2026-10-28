/**
 * @function food-reference-embed
 * @trigger ręcznie (service role lub zalogowany użytkownik), porcjami do skutku
 * @role Liczy embeddingi (Gemini, 1536) opisów referencji USDA, żeby polskie nazwy produktów dopasowywać po znaczeniu
 * @reads food_reference_usda
 * @writes food_reference_usda
 * @consumer reconcile parsera posiłków (RPC match_food_reference_usda)
 * @status active
 */
import { serveJson } from '../_shared/http.ts';
import { geminiEmbedding } from '../_shared/geminiEmbedding.ts';

const DEFAULT_BATCH = 100;
const MAX_BATCH = 100;

const MAX_BATCHES = 8;

type Db = Parameters<Parameters<typeof serveJson>[0]>[1]['supabase'];

async function embedBatch(db: Db, apiKey: string, limit: number): Promise<number> {
  const { data: rows, error } = await db.from('food_reference_usda')
    .select('fdc_id,description,category')
    .is('embedding', null)
    .order('fdc_id', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`food-reference-embed select: ${error.message}`);
  if (!rows?.length) return 0;

  const texts = rows.map((row) => (row.category ? `${row.description} (${row.category})` : row.description));
  const vectors = await geminiEmbedding(texts, apiKey);
  if (!Array.isArray(vectors) || vectors.length !== rows.length) throw new Error('food-reference-embed: embedding batch failed');

  const items = rows.map((row, index) => ({ fdc_id: row.fdc_id, embedding: JSON.stringify(vectors[index]) }));
  const { data: written, error: writeError } = await db.rpc('set_food_reference_embeddings', { items });
  if (writeError) throw new Error(`food-reference-embed write: ${writeError.message}`);
  return written ?? 0;
}

Deno.serve(serveJson(async (req, ctx) => {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const body = await req.json().catch(() => ({})) as { limit?: unknown; batches?: unknown };
  const requested = typeof body.limit === 'number' ? Math.floor(body.limit) : DEFAULT_BATCH;
  const limit = Math.min(MAX_BATCH, Math.max(1, requested));
  const batches = Math.min(MAX_BATCHES, Math.max(1, typeof body.batches === 'number' ? Math.floor(body.batches) : 1));
  const db = ctx.supabase;

  let embedded = 0;
  for (let i = 0; i < batches; i++) {
    const written = await embedBatch(db, apiKey, limit);
    embedded += written;
    if (written === 0) break;
  }
  const { count } = await db.from('food_reference_usda').select('fdc_id', { count: 'exact', head: true }).is('embedding', null);
  return { embedded, remaining: count ?? 0 };
}));
