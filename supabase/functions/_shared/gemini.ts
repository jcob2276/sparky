import { createServiceClient } from "./supabase.ts";
import { fetchWithRetry } from "./httpClient.ts";
import type { OpenAIChatParams, OpenAIChatResult } from "./openai.ts";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[]; role?: string };
}

interface GeminiApiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  embeddings?: Array<{ values: number[] }>;
  embedding?: { values: number[] };
  error?: { code?: number; message?: string };
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 8192) {
    const chunk = bytes.subarray(i, Math.min(i + 8192, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/** Call Gemini Chat/Vision API */
export async function geminiChat(params: OpenAIChatParams): Promise<OpenAIChatResult> {
  const apiKey = params.apiKey || Deno.env.get("GEMINI_API_KEY") || "";
  if (!apiKey) throw new Error("[geminiChat] Missing GEMINI_API_KEY");

  const model = (params.model && params.model.startsWith("gemini-")) ? params.model : DEFAULT_GEMINI_MODEL;
  let systemInstructionText = "";
  const contents: GeminiContent[] = [];

  for (const msg of params.messages) {
    if (msg.role === "system") {
      const sysContent = typeof msg.content === "string" ? msg.content : "";
      systemInstructionText += (systemInstructionText ? "\n\n" : "") + sysContent;
      continue;
    }
    const geminiRole = msg.role === "assistant" ? "model" : "user";
    const parts: GeminiPart[] = [];

    if (typeof msg.content === "string") {
      if (msg.content.trim()) parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          parts.push({ text: part.text });
        } else if (part.type === "image_url" && part.image_url?.url) {
          const url = part.image_url.url;
          const match = url.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          } else if (url.startsWith("http://") || url.startsWith("https://")) {
            try {
              const imgRes = await fetchWithRetry(url, { method: "GET" }, { timeoutMs: 20000, retries: 1, logTag: "gemini.fetchImage" });
              if (imgRes.ok) {
                const mimeType = imgRes.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
                const arrayBuffer = await imgRes.arrayBuffer();
                const base64Data = uint8ToBase64(new Uint8Array(arrayBuffer));
                parts.push({ inlineData: { mimeType, data: base64Data } });
              } else {
                console.warn(`[geminiChat] Failed to fetch image from URL (${imgRes.status}): ${url.slice(0, 100)}`);
              }
            } catch (fetchErr) {
              console.warn("[geminiChat] Error downloading image:", fetchErr);
            }
          }
        }
      }
    }
    if (parts.length > 0) contents.push({ role: geminiRole, parts });
  }

  const reqBody: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: params.temperature ?? 0.2,
      ...(params.maxTokens ? { maxOutputTokens: params.maxTokens } : {}),
      ...(params.responseFormat?.type === "json_object" ? { responseMimeType: "application/json" } : {}),
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };
  if (systemInstructionText.trim()) {
    reqBody.systemInstruction = { parts: [{ text: systemInstructionText }] };
  }

  const url = `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqBody),
  }, { timeoutMs: params.timeoutMs ?? 45000, retries: 1, logTag: "gemini.chat" });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const raw = (await res.json()) as GeminiApiResponse;
  if (raw.error) throw new Error(`Gemini API Error (${raw.error.code}): ${raw.error.message}`);
  const content = raw.candidates?.[0]?.content?.parts?.find((p) => typeof p.text === "string")?.text ?? "";

  try {
    const usage = raw.usageMetadata;
    if (usage) {
      const promptTokens = Number(usage.promptTokenCount ?? 0);
      const completionTokens = Number(usage.candidatesTokenCount ?? 0);
      const totalTokens = Number(usage.totalTokenCount ?? 0);
      const costEst = (promptTokens * 0.10 + completionTokens * 0.40) / 1000000.0;

      const supabaseClient = createServiceClient();
      await supabaseClient.from("vanguard_llm_usage").insert({
        user_id: params.userId || null,
        model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        cost_est: costEst,
        feature: params.feature || null,
      });
    }
  } catch (err) {
    console.error("[geminiChat] Failed to log token usage:", err);
  }

  return { content, raw };
}

const FALLBACK_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash"];

/** Transcribe audio blob via Gemini Flash (with model fallback) */
export async function geminiTranscribe(
  audioBlob: Blob,
  apiKey: string,
  opts?: { language?: string; prompt?: string; timeoutMs?: number },
): Promise<string> {
  const geminiKey = apiKey || Deno.env.get("GEMINI_API_KEY") || "";
  if (!geminiKey) throw new Error("[geminiTranscribe] Missing GEMINI_API_KEY");

  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = uint8ToBase64(new Uint8Array(arrayBuffer));
  const rawType = audioBlob.type || "audio/ogg";
  const mimeType = rawType.startsWith("audio/") ? rawType : "audio/ogg";

  const defaultPrompt =
    "Dokonaj wiernej, dokładnej transkrypcji mowy z tego nagrania audio na tekst w języku polskim. Zwróć wyłącznie sam tekst wypowiedzi, bez żadnych wstępów, cudzysłowów ani komentarzy. Jeśli nagranie zawiera tylko ciszę lub szum, zwróć pusty ciąg znaków.";
  const prompt = opts?.prompt ? `${defaultPrompt}\nKontekst / słowa kluczowe: ${opts.prompt}` : defaultPrompt;

  const candidateModels = [DEFAULT_GEMINI_MODEL, ...FALLBACK_GEMINI_MODELS];
  let lastErr: unknown;

  for (const model of candidateModels) {
    const url = `${GEMINI_API_URL}/models/${model}:generateContent?key=${geminiKey}`;
    try {
      const res = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ inlineData: { mimeType, data: base64Audio } }, { text: prompt }] }],
        }),
      }, { timeoutMs: opts?.timeoutMs ?? 45000, retries: 1, logTag: `gemini.transcribe.${model}` });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        if (res.status === 404 && model !== candidateModels[candidateModels.length - 1]) {
          console.warn(`[geminiTranscribe] Model ${model} returned 404, falling back...`);
          continue;
        }
        throw new Error(`Gemini transcribe HTTP error (${res.status}): ${errText.slice(0, 300)}`);
      }

      const raw = (await res.json()) as GeminiApiResponse;
      if (raw.error) {
        if (raw.error.code === 404 && model !== candidateModels[candidateModels.length - 1]) {
          console.warn(`[geminiTranscribe] Model ${model} returned 404 in body, falling back...`);
          continue;
        }
        throw new Error(`Gemini transcribe error (${raw.error.code}): ${raw.error.message}`);
      }
      const parts = raw.candidates?.[0]?.content?.parts ?? [];
      const textParts = parts
        .filter((p) => typeof p.text === "string" && p.text.trim())
        .map((p) => p.text!.trim());
      const transcribed = textParts.join(" ");
      return transcribed.trim();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if ((msg.includes("404") || msg.includes("not found")) && model !== candidateModels[candidateModels.length - 1]) {
        console.warn(`[geminiTranscribe] Model ${model} error (${msg}), trying fallback...`);
        continue;
      }
      throw err;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

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
