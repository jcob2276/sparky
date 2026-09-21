import { createServiceClient } from "./supabase.ts";
import { fetchWithRetry } from "./httpClient.ts";
import { geminiChat, geminiEmbedding, geminiTranscribe } from "./gemini.ts";

type OpenAIMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: OpenAIMessageContent;
}

export interface OpenAIChatParams {
  apiKey: string;
  messages: OpenAIMessage[];
  model?: string;
  maxTokens?: number | null;
  temperature?: number | null;
  timeoutMs?: number;
  responseFormat?: { type: 'json_object' };
  userId?: string;
  feature?: string;
}

export interface OpenAIChatResult {
  content: string;
  raw: unknown;
}

/** Centralized chat-completions call (text or vision) — uses Gemini when available or OpenAI fallback. */
export async function openaiChat(params: OpenAIChatParams): Promise<OpenAIChatResult> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    try {
      return await geminiChat(params);
    } catch (err) {
      console.error("[openaiChat] Gemini failed:", err);
      throw err;
    }
  }

  const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || (params.apiKey?.startsWith("sk-") ? params.apiKey : "");
  if (!openaiApiKey) {
    throw new Error("[openaiChat] Missing valid OPENAI_API_KEY for fallback");
  }

  const timeoutMs = params.timeoutMs ?? 45000;
  const fallbackModel = (params.model && !params.model.startsWith("gemini-")) ? params.model : "gpt-4o-mini";
  const res = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: fallbackModel,
      messages: params.messages,
      ...(params.maxTokens === null ? {} : { max_tokens: params.maxTokens ?? 500 }),
      ...(params.temperature === null ? {} : { temperature: params.temperature ?? 0.2 }),
      ...(params.responseFormat ? { response_format: params.responseFormat } : {}),
    }),
  }, { timeoutMs, retries: 1, logTag: "openai.chat" });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI error (${res.status}): ${errText.slice(0, 200)}`);
  }

  const raw = await res.json();
  const content: string = (raw as { choices?: Array<{ message?: { content?: string } }> })
    ?.choices?.[0]?.message?.content || "";

  try {
    const usage = (raw as { usage?: Record<string, unknown> })?.usage;
    if (usage) {
      const promptTokens = Number(usage.prompt_tokens ?? 0);
      const completionTokens = Number(usage.completion_tokens ?? 0);
      const totalTokens = Number(usage.total_tokens ?? 0);
      const selectedModel = params.model ?? "gpt-4o-mini";

      let costEst = 0.0;
      if (selectedModel.includes("gpt-4o-mini")) {
        costEst = (promptTokens * 0.15 + completionTokens * 0.60) / 1000000.0;
      } else if (selectedModel.includes("gpt-4o")) {
        costEst = (promptTokens * 2.50 + completionTokens * 10.00) / 1000000.0;
      } else {
        costEst = (promptTokens * 0.15 + completionTokens * 0.60) / 1000000.0;
      }

      const supabaseClient = createServiceClient();
      await supabaseClient.from("vanguard_llm_usage").insert({
        user_id: params.userId || null,
        model: selectedModel,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        cost_est: costEst,
        feature: params.feature || null,
      });
    }
  } catch (err) {
    console.error("[openaiChat] Failed to log token usage:", err);
  }

  return { content, raw };
}

/** Centralized audio transcription — delegates to Gemini 3 Flash when GEMINI_API_KEY is present, or Whisper fallback. */
export async function transcribeBlob(
  audioBlob: Blob,
  apiKey: string,
  opts?: { filename?: string; language?: string; prompt?: string; timeoutMs?: number },
): Promise<string> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  let geminiErr: unknown = null;
  if (geminiKey) {
    try {
      return await geminiTranscribe(audioBlob, geminiKey, opts);
    } catch (err) {
      geminiErr = err;
      console.warn("[transcribeBlob] Gemini audio transcription failed, checking OpenAI fallback:", err);
      if (!apiKey || !apiKey.startsWith("sk-")) throw err;
    }
  }

  const defaultPrompt = "Jakub, Vanguard, Oura, Garmin, Strava, diale, setting, no-showy, Transerfing, Cooper, Krosno, suplementy, zadania, trening";
  const filename = opts?.filename ?? "audio.ogg";
  const language = opts?.language ?? "pl";
  const prompt = opts?.prompt ?? defaultPrompt;
  const timeoutMs = opts?.timeoutMs ?? 45000;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const formData = new FormData();
    formData.append("file", audioBlob, filename);
    formData.append("model", "whisper-1");
    formData.append("language", language);
    formData.append("prompt", prompt);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => "unknown");
        if ((res.status === 429 || res.status >= 500) && attempt === 0) {
          console.warn(`[openai.transcribe] HTTP ${res.status}: ${errText.slice(0, 100)}, retrying in 1s...`);
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        throw new Error(`Whisper HTTP error (${res.status}): ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      if (data.error) throw new Error(`Whisper Error: ${data.error.message}`);
      return data.text || "";
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (attempt === 0) {
        console.warn(`[openai.transcribe] attempt 1 failed: ${err}, retrying...`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
    }
  }

  if (geminiErr) {
    const gMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
    const wMsg = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Transkrypcja nie powiodła się: [Gemini: ${gMsg}] [Whisper: ${wMsg}]`);
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Centralized 1536d embeddings — delegates to Gemini gemini-embedding-001 or OpenAI fallback. */
export async function getEmbedding(text: string | string[], apiKey: string): Promise<number[] | number[][] | null> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    const geminiRes = await geminiEmbedding(text, geminiKey);
    if (geminiRes) return geminiRes;
    console.warn("[getEmbedding] Gemini embedding returned null, trying OpenAI fallback...");
  }

  if (!apiKey) {
    console.error("[OpenAI] Missing API key for embedding generation.");
    return null;
  }
  try {
    const res = await fetchWithRetry("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: Array.isArray(text) ? text : text.replace(/\n/g, " ").slice(0, 8000),
      }),
    }, { timeoutMs: 15000, retries: 1, logTag: "openai.embedding" });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[OpenAI] Embedding HTTP error (${res.status}): ${errText.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    if (Array.isArray(text)) {
      const items = (data.data as Array<{ embedding?: number[] }>) ?? [];
      return items.map((d) => d.embedding ?? []);
    }
    return (data.data as Array<{ embedding?: number[] }>)?.[0]?.embedding ?? null;
  } catch (err) {
    console.error("[OpenAI] Embedding exception caught:", err);
    return null;
  }
}
