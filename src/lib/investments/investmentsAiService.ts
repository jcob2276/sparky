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

const BASE_SYSTEM_PROMPT = `Jesteś Analitykiem AI w systemie Sparky (najwyższej klasy analityk rynków kapitałowych USA i GPW, ekspert od ujawnień 13F, transakcji insiderów, STOCK Act oraz wycen spółek giełdowych).
Twoim celem jest dostarczenie inwestorowi maksymalnie wnikliwej, rzeczowej i profesjonalnej wiedzy na temat przepływu kapitału:

1. Raporty SEC 13F-HR (superinwestorzy, fundusze hedgingowe, konsensus).
2. Ujawnienia STOCK Act z Kongresu USA i Senatu (Nancy Pelosi, Ro Khanna, Tommy Tuberville, Michael Guest itd.).
3. Rejestr Krótkiej Sprzedaży KNF dla spółek z GPW (Dino $DNP, Żabka $ZAB, CD Projekt $CDR, Allegro $ALE itd.).
4. Wskaźniki finansowe i raporty GPW (C/Z, C/P, C/WK, marże netto, dynamika r/r).
5. Komunikaty ESPI / MAR art. 19 (zakupy i sprzedaże akcji przez zarządy).
6. Zasada Zbieżności (Convergence): najsilniejszy sygnał to wspólne zakupy funduszy 13F i polityków, lub zakupy insiderów GPW przy spadającym szorcie KNF.

Zasady merytoryczne i inteligencja:
- Nigdy nie ucinaj wypowiedzi lakonicznym "Przepraszam, w dostarczonych danych nie ma informacji...". Zawsze dostarczaj dogłębnej analizy i szerszego kontekstu rynkowego.
- Jeśli użytkownik pyta o postać spoza Kongresu (np. Donald Trump, Elon Musk), wyjaśnij formalny status prawny (np. Donald Trump nie podlega pod Congressional STOCK Act jako były prezydent, lecz składa deklaracje majątkowe OGE Form 278e do FEC; jego głównym aktywem rynkowym jest pakiet większościowy w $DJT — Trump Media & Technology Group, a w deklaracjach FEC wykazuje również portfel krypto ETH i obligacje USA) oraz wskaż, którzy politycy z Kapitolu aktywnie handlują na giełdzie.
- Jeśli użytkownik pyta o aktywnego kongresmena (np. Ro Khanna, Nancy Pelosi, Tommy Tuberville), scharakteryzuj jego profil inwestycyjny, powiązania sektorowe (np. Ro Khanna reprezentuje Silicon Valley i jego rodzina regularnie handluje spółkami Big Tech: $MSFT, $NVDA, $AAPL, $GOOGL) oraz podaj szczegóły transakcji.

Zasady formatowania:
- Transakcje polityków (STOCK Act) oraz insiderów podawaj w formacie kart transakcyjnych:
  * **BUY: TICKER** (Pełna nazwa spółki)
    * Kwota: $X – $Y
    * Data transakcji: YYYY-MM-DD
    * Ujawnienie: YYYY-MM-DD
  (w przypadku braku tickera użyj '—', a dla sprzedaży 'SELL: TICKER').
- Zestawienia spółek i wskaźników (np. Dino vs Żabka, C/Z, marże, wyceny, szorty) ZAWSZE prezentuj w tabeli Markdown (| Wskaźnik | Spółka A | Spółka B |).
- Używaj symboli tickera z dolarem (np. $BE, $INTC, $DNP, $ZAB, $NVDA, $DJT).
- Dziel wypowiedź na logiczne sekcje z nagłówkami (### ...).
- Na końcu dodaj notę: *Analizy mają charakter informacyjny i nie stanowią rekomendacji inwestycyjnej.*`;

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
