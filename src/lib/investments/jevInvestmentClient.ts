/**
 * jevInvestmentClient.ts — Klient modelu decyzyjnego TypeSafe AI "Jev" (System 1)
 * dla modułu /inwestycje.
 * 
 * Jev nie generuje tekstu — wykonuje błyskawiczne estymacje prawdopodobieństw (Noul),
 * scoring siły sygnału (Score 1-5) oraz kategoryzację intencji rynkowych (Choice).
 */

const OPENROUTER_API_KEY = atob(
  'c2stb3ItdjEtMDE4NzQ0M2U2NTk0NmRlMTg1MDE1NmY3MzMzMTQ0OWU1MWE2ZTczMTQ2Y2Y1ZjFhNWUwMTQ1OTYzYjFjZmQxNw=='
);
const JEV_ENDPOINT = 'https://openrouter.ai/api/alpha/decisions';

export interface JevSignalEvaluation {
  signalScore: number; // 1.0 - 5.0
  confidence: number;  // 0.0 - 1.0
  rallyProbability: number; // 0.0 - 1.0 (Noul)
  riskLevel: 'niski' | 'umiarkowany' | 'wysoki';
  urgency: 'natychmiastowe' | 'obserwacja' | 'brak';
}

interface RawJevResponse {
  model?: string;
  answers?: {
    signal_strength?: {
      type?: 'score';
      score?: number;
      confidence?: number;
    };
    rally_probability?: {
      type?: 'noul';
      noul?: number;
    };
    risk_level?: {
      type?: 'choice';
      choice?: string;
    };
    timing_urgency?: {
      type?: 'choice';
      choice?: string;
    };
  };
}

/**
 * Ocenia dany przypadek inwestycyjny / sytuację rynkową przy użyciu Jeva w Systemie 1.
 * Czas wykonania: ~400-800ms.
 */
export async function evaluateInvestmentSignalWithJev(
  marketContext: string
): Promise<JevSignalEvaluation | null> {
  if (!marketContext || marketContext.trim().length < 10) return null;

  try {
    const res = await fetch(JEV_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jev-latest',
        state: marketContext.slice(0, 1500),
        questions: {
          signal_strength: {
            type: 'score',
            instructions: 'Oceń siłę sygnału akumulacji smart money od 1 (szum rynkowy) do 5 (najwyższa konwekcja)',
            criteria: ['Szum', 'Słaby', 'Umiarkowany', 'Silny', 'Najwyższa konwekcja'],
          },
          rally_probability: {
            type: 'noul',
            instructions: 'Jakie jest prawdopodobieństwo kontynuacji ruchu wzrostowego lub short squeeze w horyzoncie 30-90 dni?',
          },
          risk_level: {
            type: 'choice',
            instructions: 'Oceń poziom ryzyka asymetrii tej transakcji',
            criteria: {
              niski: 'Wysoki margines bezpieczeństwa, spółka w strefie wejścia lub z dyskontem',
              umiarkowany: 'Standardowa zmienność rynkowa, umiarkowana wycena',
              wysoki: 'Spółka po silnym rajdzie, ryzyko korekty lub brak dywergencji',
            },
          },
          timing_urgency: {
            type: 'choice',
            instructions: 'Jak pilna jest reakcja czasowa?',
            criteria: {
              natychmiastowe: 'Świeża transakcja < 7 dni lub klastry insiderów, pociąg zaraz odjeżdża',
              obserwacja: 'Pozycja w budowie, można poczekać na korektę lub potwierdzenie',
              brak: 'Informacja historyczna lub opóźniona, brak pośpiechu',
            },
          },
        },
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as RawJevResponse;
    const ans = data.answers;
    if (!ans) return null;

    const rawScore = ans.signal_strength?.score ?? 3.0;
    const rawConf = ans.signal_strength?.confidence ?? 0.5;
    const rawRally = ans.rally_probability?.noul ?? 0.5;
    const riskChoice = ans.risk_level?.choice as 'niski' | 'umiarkowany' | 'wysoki' || 'umiarkowany';
    const urgencyChoice = ans.timing_urgency?.choice as 'natychmiastowe' | 'obserwacja' | 'brak' || 'obserwacja';

    return {
      signalScore: Math.round(rawScore * 10) / 10,
      confidence: Math.round(rawConf * 100) / 100,
      rallyProbability: Math.round(rawRally * 100),
      riskLevel: riskChoice,
      urgency: urgencyChoice,
    };
  } catch {
    return null;
  }
}
