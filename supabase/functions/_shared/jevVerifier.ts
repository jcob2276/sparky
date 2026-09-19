import { isJevAvailable, jevDecide, type JevAnswerNoul, type JevAnswerChoice } from "./jev.ts";

interface DataVerificationParams {
  task: string;
  dataSummary: Record<string, unknown>;
  minThreshold?: number;
}

interface DataVerificationResult {
  isSufficient: boolean;
  sufficiencyScore: number;
  missingDimensions: string[];
  reason: string;
}

/**
 * Universal Verifier (System One Gate):
 * Checks if telemetry and behavioral records are sufficient before running expensive LLM tasks.
 */
export async function verifyDataSufficiencyWithJev(
  params: DataVerificationParams
): Promise<DataVerificationResult> {
  if (!isJevAvailable()) {
    return { isSufficient: true, sufficiencyScore: 1.0, missingDimensions: [], reason: "Jev unavailable, bypassed" };
  }

  try {
    const decision = await jevDecide({
      state: {
        target_task: params.task,
        telemetry_summary: params.dataSummary,
      },
      questions: {
        is_data_sufficient: {
          type: "noul",
          instructions: Czy zgromadzone dane telemetryczne i behawioralne sa wystarczajace do przeprowadzenia wartosciowej analizy zadania: '' bez halucynowania brakujacych faktow?,
        },
        missing_dimension: {
          type: "choice",
          instructions: "Jaki jest glowny brak w danych, uniemozliwiajacy rzetelna analize?",
          criteria: {
            none: "Dane sa kompletne lub wystarczajace do rzetelnego raportu.",
            biometrics_missing: "Brak danych biometrycznych (sen, HRV, aktywnosc) z kluczowych dni.",
            reflections_missing: "Brak notatek, dziennika lub wieczornych refleksji uzytkownika.",
            plans_missing: "Brak zadeklarowanych planow lub celow w analizowanym oknie.",
            stream_empty: "Brak wpisow w strumieniu biezacym.",
          },
        },
      },
      timeoutMs: 6000,
    });

    const noulAns = decision.answers.is_data_sufficient as JevAnswerNoul;
    const choiceAns = decision.answers.missing_dimension as JevAnswerChoice;

    const prob = noulAns?.noul ?? 0.5;
    const threshold = params.minThreshold ?? 0.65;
    const isSufficient = prob >= threshold;

    const missing = choiceAns?.choice && choiceAns.choice !== "none" ? [choiceAns.choice] : [];

    return {
      isSufficient,
      sufficiencyScore: prob,
      missingDimensions: missing,
      reason: isSufficient
        ? "Wystarczajace dane"
        : Niewystarczajace dane (prob=%, glowny brak: ),
    };
  } catch (err) {
    console.warn("[jevVerifier] Verification failed, defaulting to sufficient:", err);
    return { isSufficient: true, sufficiencyScore: 1.0, missingDimensions: [], reason: "Fallback on error" };
  }
}