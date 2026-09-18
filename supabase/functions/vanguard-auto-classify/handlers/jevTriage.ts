import {
  isJevAvailable,
  jevDecide,
  type JevDecisionResult,
  type JevAnswerChoice,
  type JevAnswerNoul,
  type JevAnswerScore,
} from "../../_shared/jev.ts";

export interface JevTriageResult {
  category: string;
  temporality: string;
  importanceScore: number;
  isFrictionProb: number;
  skipFrictionLlm: boolean;
  decision: JevDecisionResult;
}

/**
 * Executes fast System 1 triage on a stream record using Jev.
 * Returns null if Jev is unavailable or an error occurs.
 */
export async function runJevTriage(content: string): Promise<JevTriageResult | null> {
  if (!isJevAvailable()) return null;

  try {
    const decision = await jevDecide({
      state: content,
      questions: {
        category: {
          type: "choice",
          instructions: "Do jakiej kategorii Vanguard OS należy ta notatka?",
          criteria: {
            "Ciało": "Zdrowie, sen, dieta, trening, biometria, samopoczucie fizyczne",
            "Konto": "Finanse, zakupy, pieniądze, inwestycje, zarobki, transakcje",
            "Duch": "Praca głęboka, kodowanie, twórczość, intelekt, sens, medytacja",
            "Relacje": "Ludzie, rodzina, dziewczyna, znajomi, komunikacja społeczna",
            "Chaos": "Szum, luźne myśli, przypadkowe linki, notatki bez kontekstu",
          },
        },
        temporality: {
          type: "choice",
          instructions: "Czy notatka opisuje trwały wzorzec/nawyk, czy jednorazowe tymczasowe zdarzenie?",
          criteria: {
            "trwałe": "Trwały nawyk, stała preferencja, reguła życiowa, trwała cecha",
            "tymczasowe": "Jednorazowe zdarzenie, chwilowy stan dzisiejszy, incydent, bieżąca myśl",
          },
        },
        importance_score: {
          type: "score",
          instructions: "Oceń wagę i istotność tej notatki dla życia Jakuba od 1 (błahy szum) do 10 (kluczowe)",
          criteria: [
            "1: Błahy szum, całkowicie nieistotne",
            "3: Drobny fakt z dnia codziennego",
            "5: Standardowe zdarzenie lub uwaga",
            "7: Ważna obserwacja behawioralna lub postęp",
            "10: Przełomowe zdarzenie życiowe lub krytyczny wgląd",
          ],
        },
        is_friction_or_behavior: {
          type: "noul",
          instructions:
            "Czy ten tekst opisuje jakiekolwiek tarcie behawioralne (opór, prokrastynacja, zmęczenie, zły nawyk), powrót do pionu (recovery) lub mikrogest?",
        },
      },
    });

    const isFrictionNoul = (decision.answers.is_friction_or_behavior as JevAnswerNoul)?.noul ?? 0.5;
    const categoryChoice = (decision.answers.category as JevAnswerChoice)?.choice ?? "Chaos";
    const temporalityChoice = (decision.answers.temporality as JevAnswerChoice)?.choice ?? "tymczasowe";
    const scoreVal = (decision.answers.importance_score as JevAnswerScore)?.score ?? 2.5;

    // Map Jev score (1..5 indices) to Vanguard 1..10 scale
    const importanceScore = Math.max(1, Math.min(10, Math.round(scoreVal * 2)));
    const skipFrictionLlm = isFrictionNoul < 0.20;

    return {
      category: categoryChoice,
      temporality: temporalityChoice,
      importanceScore,
      isFrictionProb: isFrictionNoul,
      skipFrictionLlm,
      decision,
    };
  } catch (err) {
    console.warn("[jevTriage] Jev evaluation failed, continuing with standard pipeline:", err);
    return null;
  }
}
