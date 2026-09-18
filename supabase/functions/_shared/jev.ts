/**
 * jev.ts — TypeSafe AI "Jev" System-1 decision client.
 *
 * Jev is a decision-only model (no text generation) designed for fast, typed,
 * probabilistic program branching (noul, choice, score).
 * Accessed via OpenRouter's `/api/alpha/decisions` endpoint.
 */
import { fetchWithRetry } from './httpClient.ts';

type JevQuestionNoul = {
  type: 'noul';
  instructions: string;
};

type JevQuestionChoice = {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string>;
};

type JevQuestionScore = {
  type: 'score';
  instructions: string;
  criteria: string[];
};

type JevQuestion = JevQuestionNoul | JevQuestionChoice | JevQuestionScore;

export type JevAnswerNoul = {
  type: 'noul';
  noul: number; // 0.0 to 1.0 probability
};

export type JevAnswerChoice = {
  type: 'choice';
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};

export type JevAnswerScore = {
  type: 'score';
  score: number;
  confidence: number;
  probabilities?: Record<string, number>;
  legend?: Record<string, string>;
};

type JevAnswer = JevAnswerNoul | JevAnswerChoice | JevAnswerScore;

export interface JevDecisionParams {
  state: string | Record<string, unknown> | unknown[];
  questions: Record<string, JevQuestion>;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export interface JevDecisionResult {
  model: string;
  answers: Record<string, JevAnswer>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cost: number;
  };
  provider?: string;
  id?: string;
}

/** Check if Jev API key is configured in current environment. */
export function isJevAvailable(): boolean {
  return Boolean(
    Deno.env.get('OPENROUTER_API_KEY') ||
    Deno.env.get('TYPESAFE_API_KEY')
  );
}

/**
 * Executes a structured decision query against Jev.
 */
export async function jevDecide(params: JevDecisionParams): Promise<JevDecisionResult> {
  const apiKey =
    params.apiKey ||
    Deno.env.get('OPENROUTER_API_KEY') ||
    Deno.env.get('TYPESAFE_API_KEY') ||
    '';

  if (!apiKey) {
    throw new Error('[jevDecide] Missing OPENROUTER_API_KEY or TYPESAFE_API_KEY');
  }

  const model = params.model ?? 'jev-latest';
  const timeoutMs = params.timeoutMs ?? 10000;

  const endpoint = 'https://openrouter.ai/api/alpha/decisions';

  const res = await fetchWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        state: params.state,
        questions: params.questions,
      }),
    },
    {
      timeoutMs,
      retries: 1,
      logTag: 'jev.decide',
    }
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`[jevDecide] HTTP ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as JevDecisionResult;
  return data;
}
