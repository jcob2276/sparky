import {
  isJevAvailable,
  jevDecide,
  type JevDecisionResult,
  type JevAnswerChoice,
  type JevAnswerScore,
} from "../../_shared/jev.ts";

export interface JevTriageResult {
  category: string;
  temporality: string;
  importanceScore: number;
  eventKind: string;
  frictionType: string | null;
  minConfidence: number;
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
        event_kind: {
          type: "choice",
          instructions: "Sklasyfikuj typ zdarzenia behawioralnego w tekście.",
          criteria: {
            "friction_event": "Wyraźne odchylenie od intencji (miałem zrobić, a nie zrobiłem).",
            "positive_micro_action": "Dobry mikrogest, małe działanie na plus.",
            "recovery_event": "Powrót do pionu po tarciu, przełamanie oporu.",
            "state_observation": "Czysty stan fizyczny/emocjonalny (ból, zmęczenie) bez złamanej intencji.",
            "micro_behavior_observation": "Nawykowe zachowanie bez intencji w danym momencie.",
            "reflection": "Refleksja, wnioski, generalizacja.",
            "none": "Brak jakichkolwiek elementów behawioralnych, suchy fakt lub pytanie."
          }
        },
        friction_type: {
          type: "choice",
          instructions: "Jeśli to friction_event lub recovery, jakiego obszaru dotyczy?",
          criteria: {
            "avoidance": "Unikanie sytuacji/zadania/konfrontacji.",
            "procrastination": "Odkładanie w czasie bez racjonalnego powodu.",
            "habit_break": "Przerwanie rutyny (np. dieta, trening).",
            "sleep_disruption": "Późne spanie, zaspanie, problem ze snem.",
            "other": "Inne tarcie lub brak tarcia."
          }
        }
      },
    });

    const categoryAns = decision.answers.category as JevAnswerChoice;
    const temporalityAns = decision.answers.temporality as JevAnswerChoice;
    const scoreAns = decision.answers.importance_score as JevAnswerScore;
    const eventKindAns = decision.answers.event_kind as JevAnswerChoice;
    const frictionTypeAns = decision.answers.friction_type as JevAnswerChoice;

    const categoryChoice = categoryAns?.choice ?? "Chaos";
    const temporalityChoice = temporalityAns?.choice ?? "tymczasowe";
    const scoreVal = scoreAns?.score ?? 2.5;
    const eventKindChoice = eventKindAns?.choice ?? "none";
    const frictionTypeChoice = frictionTypeAns?.choice === "other" ? null : (frictionTypeAns?.choice ?? null);

    const confidences = [
      categoryAns?.confidence ?? 0,
      temporalityAns?.confidence ?? 0,
      scoreAns?.confidence ?? 0,
      eventKindAns?.confidence ?? 0,
      frictionTypeAns?.confidence ?? 0,
    ];
    const minConfidence = Math.min(...confidences);

    const importanceScore = Math.max(1, Math.min(10, Math.round(scoreVal * 2)));

    return {
      category: categoryChoice,
      temporality: temporalityChoice,
      importanceScore,
      eventKind: eventKindChoice,
      frictionType: frictionTypeChoice,
      minConfidence,
      decision,
    };
  } catch (err) {
    console.warn("[jevTriage] Jev evaluation failed, continuing with standard pipeline:", err);
    return null;
  }
}