import { fetchWithRetry } from "./httpClient.ts";
import { GEMINI_API_URL, DEFAULT_EMBEDDING_MODEL, type GeminiApiResponse } from "./gemini.ts";

/** Generate 1536-dimensional embedding via Gemini gemini-embedding-001 */
export async function geminiEmbedding(
  text: string | string[],
  apiKey: string,
): Promise<number[] | number[][] | null> {
  const geminiKey = apiKey || Deno.env.get("GEMINI_API_KEY") || "";
  if (!geminiKey) {
    console.error("[geminiEmbedding] Missing GEMINI_API_KEY");
    return null;
  }

  try {
    if (Array.isArray(text)) {
      if (text.length === 0) return [];
      const requests = text.map((t) => ({
        model: `models/${DEFAULT_EMBEDDING_MODEL}`,
        content: { parts: [{ text: t.replace(/\n/g, " ").slice(0, 8000) }] },
        outputDimensionality: 1536,
      }));

      const url = `${GEMINI_API_URL}/models/${DEFAULT_EMBEDDING_MODEL}:batchEmbedContents?key=${geminiKey}`;
      const res = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      }, { timeoutMs: 30000, retries: 1, logTag: "gemini.batchEmbedding" });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`[geminiEmbedding] HTTP error (${res.status}): ${errText.slice(0, 300)}`);
        return null;
      }

      const data = (await res.json()) as GeminiApiResponse;
      return data.embeddings?.map((e) => e.values) ?? null;
    }

    const cleanText = text.replace(/\n/g, " ").slice(0, 8000);
    const url = `${GEMINI_API_URL}/models/${DEFAULT_EMBEDDING_MODEL}:embedContent?key=${geminiKey}`;
    const res = await fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: cleanText }] },
        outputDimensionality: 1536,
      }),
    }, { timeoutMs: 15000, retries: 1, logTag: "gemini.embedding" });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[geminiEmbedding] HTTP error (${res.status}): ${errText.slice(0, 300)}`);
      return null;
    }

    const data = (await res.json()) as GeminiApiResponse;
    return data.embedding?.values ?? null;
  } catch (err) {
    console.error("[geminiEmbedding] Exception caught:", err);
    return null;
  }
}
