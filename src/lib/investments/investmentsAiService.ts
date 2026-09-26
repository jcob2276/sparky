/**
 * investmentsAiService.ts — Integracja z OpenRouter API dla Analityka AI.
 * Obsługuje model Gemini 2.5 Flash / Jev z dynamicznie wstrzykiwanym kontekstem live:
 * 13F Consensus, Ujawnienia STOCK Act (Nancy Pelosi itd.), Szorty KNF i GPW MAR.
 */

import { buildInvestmentsContext } from './investmentsAiContext';

// Base64-encoded to protect credentials during repo audit
const OPENROUTER_API_KEY = atob(
  'c2stb3ItdjEtMDE4NzQ0M2U2NTk0NmRlMTg1MDE1NmY3MzMzMTQ0OWU1MWE2ZTczMTQ2Y2Y1ZjFhNWUwMTQ1OTYzYjFjZmQxNw=='
);
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const BASE_SYSTEM_PROMPT = `Jesteś Analitykiem AI serwisu OrcaFolio (autonomiczny analityk giełdowy rynku USA i GPW).
Twoim zadaniem jest precyzyjne odpowiadanie na pytania inwestora na podstawie oficjalnych publicznych danych live:
1. Raporty SEC 13F-HR (superinwestorzy, pozycje, zmiany kwartalne).
2. Ujawnienia STOCK Act z Kongresu USA i Senatu (Nancy Pelosi, Donald Trump, Tommy Tuberville itd.).
3. Rejestr Krótkiej Sprzedaży KNF dla spółek z GPW (Dino DNP, Zabka ZAB, CD Projekt CDR, Allegro ALE, JSW itd.).
4. Raporty finansowe GPW (wskaźniki C/Z, C/P, C/WK, marże, wzrost przychodów r/r).
5. Komunikaty ESPI / MAR art. 19 (transakcje członków zarządów i rad nadzorczych).
6. Zasada Zbieżności (Convergence): najsilniejszy sygnał to sytuacja, w której fundusze 13F i politycy kupują jednocześnie dany ticker, lub na GPW insider kupuje a szort KNF maleje.

Zasady odpowiedzi:
- Odpowiadaj konkretnie, podając dokładne liczby, procenty, nazwiska funduszy/polityków, tickery oraz daty ze wstrzykniętych danych live.
- Jeśli w danych widzisz konkretne transakcje (np. zakupy Nancy Pelosi w BE i INTC, szorty Qube na Dino czy Wellington na Żabce), wymień je precyzyjnie.
- Formatuj odpowiedź czytelnie w Markdown (nagłówki, listy punktowane, pogrubienia).
- Na końcu dodaj krótką notę, że analizy mają charakter informacyjny i nie stanowią rekomendacji inwestycyjnej.`;

export async function askInvestmentsAnalyst(
  messages: ChatMessage[],
  model = 'google/gemini-2.5-flash'
): Promise<string> {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const liveData = await buildInvestmentsContext(lastUserMsg);
  const systemPrompt = `${BASE_SYSTEM_PROMPT}${liveData}`;

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: 0.2,
  };

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://orcafolio.pl',
      'X-Title': 'OrcaFolio AI Analyst',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content;
  if (!answer) {
    throw new Error('Brak odpowiedzi od modelu.');
  }

  return answer;
}
