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

// Legacy exports keep existing callers compatible; all requests use Gemini exclusively.
export function openaiChat(params: OpenAIChatParams): Promise<OpenAIChatResult> {
  return geminiChat({ ...params, apiKey: Deno.env.get("GEMINI_API_KEY") || params.apiKey });
}

/** Audio transcription with fallback between Gemini models. */
export function transcribeBlob(
  audioBlob: Blob,
  apiKey: string,
  opts?: { filename?: string; language?: string; prompt?: string; timeoutMs?: number },
): Promise<string> {
  return geminiTranscribe(audioBlob, Deno.env.get("GEMINI_API_KEY") || apiKey, opts);
}

/** Generate 1536-dimensional vectors using Gemini. */
export function getEmbedding(text: string | string[], apiKey: string): Promise<number[] | number[][] | null> {
  return geminiEmbedding(text, Deno.env.get("GEMINI_API_KEY") || apiKey);
}
