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
          instructions: `Czy zgromadzone dane telemetryczne i behawioralne sa wystarczajace do przeprowadzenia wartosciowej analizy zadania: '${params.task}' bez halucynowania brakujacych faktow?`,
        },
        missing_dimension: {
          type: "choice",
          instructions: "Jaki jest glowny brak w danych, uniemozliwiajacy rzetelna analize?",
          criteria: {
            none: "Dane sa kompletne lub wystarczajace do rzetelnego raportu.",
            biometrics_missing: "Prawie calkowity brak danych biometrycznych (mniej niz 3 dni ze snem/HRV w oknie 7 dni).",
            reflections_missing: "Calkowity brak notatek, dziennika ani refleksji uzytkownika (mniej niz 3 dni z wpisem w oknie 7 dni).",
            plans_missing: "Calkowity brak zadeklarowanych planow, zadan Power Listy ani celow (mniej niz 3 dni z planem w oknie 7 dni).",
            stream_empty: "Brak jakichkolwiek wpisow w strumieniu biezacym (stream_count = 0).",
          },
        },
      },
      timeoutMs: 6000,
    });

    const noulAns = decision.answers.is_data_sufficient as JevAnswerNoul;
    const choiceAns = decision.answers.missing_dimension as JevAnswerChoice;

    const prob = noulAns?.noul ?? 0.5;
    const threshold = params.minThreshold ?? 0.65;
    const isNoneMissing = choiceAns?.choice === "none";
    const isSufficient = isNoneMissing || prob >= threshold;
    const sufficiencyScore = isNoneMissing ? Math.max(prob, 0.95) : prob;

    const missing = choiceAns?.choice && choiceAns.choice !== "none" ? [choiceAns.choice] : [];

    return {
      isSufficient,
      sufficiencyScore,
      missingDimensions: missing,
      reason: isSufficient
        ? "Wystarczajace dane"
        : `Niewystarczajace dane (prob=${Math.round(prob * 100)}%, glowny brak: ${choiceAns?.choice ?? "nieznany"})`,
    };
  } catch (err) {
    console.warn("[jevVerifier] Verification failed, defaulting to sufficient:", err);
    return { isSufficient: true, sufficiencyScore: 1.0, missingDimensions: [], reason: "Fallback on error" };
  }
}