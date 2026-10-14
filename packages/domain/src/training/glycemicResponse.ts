export interface GlycemicNutrientInput {
  carbsGrams: number;
  fiberGrams?: number | null;
  proteinGrams: number;
  fatGrams: number;
}

export interface EstimatedGlycemicResponse {
  state: 'estimated' | 'missing_carbs' | 'provisional_unknown_fiber';
  netCarbsGrams: number;
  glycemicImpactScore: number;
  tier: 'low' | 'moderate' | 'high';
  tierLabel: string;
  absorptionProfile: {
    estimatedPeakMinutes: number;
    peakWindowLabel: string;
    description: string;
  };
  nonDiagnosticNotice: string;
}

const NON_DIAGNOSTIC_NOTICE =
  'Szacunek orientacyjny oparty o proporcje makroskładników i błonnika. Nie stanowi pomiaru stężenia glukozy we krwi, odczytu CGM ani diagnozy medycznej.';

/**
 * Deterministic orientational glycemic response estimator.
 *
 * Invariants:
 * - Protein, fat, and dietary fiber slow down gastric emptying and blunt insulin/glucose peaks
 * - Missing fiber is labeled explicitly as 'provisional_unknown_fiber'
 * - Zero claims of actual blood sugar measurement
 */
export function estimateGlycemicResponse(
  input: GlycemicNutrientInput
): EstimatedGlycemicResponse {
  const carbs = Math.max(0, input.carbsGrams || 0);
  const protein = Math.max(0, input.proteinGrams || 0);
  const fat = Math.max(0, input.fatGrams || 0);
  const fiberUnknown = input.fiberGrams == null;
  const fiber = Math.max(0, input.fiberGrams ?? 0);

  if (carbs <= 0) {
    return {
      state: 'missing_carbs',
      netCarbsGrams: 0,
      glycemicImpactScore: 0,
      tier: 'low',
      tierLabel: 'Minimalny wpływ glikemiczny (znikoma ilość węglowodanów)',
      absorptionProfile: {
        estimatedPeakMinutes: 60,
        peakWindowLabel: 'Brak skoku glikemii',
        description: 'Posiłek oparty głównie na białku i tłuszczach — minimalna odpowiedź glikemiczna.',
      },
      nonDiagnosticNotice: NON_DIAGNOSTIC_NOTICE,
    };
  }

  const netCarbs = Math.max(0, Math.round((carbs - fiber) * 10) / 10);

  // Blunting factor: protein (0.015), fat (0.02), fiber (0.04)
  const blunting = 1 + (0.015 * protein) + (0.02 * fat) + (0.04 * fiber);
  const rawScore = netCarbs / blunting;
  const score = Math.min(100, Math.max(1, Math.round(rawScore * 10) / 10));

  let tier: 'low' | 'moderate' | 'high' = 'moderate';
  let tierLabel = 'Umiarkowany wpływ glikemiczny — zrównoważone uwalnianie energii';
  let estimatedPeakMinutes = 60;
  let peakWindowLabel = 'Szczyt po ok. 45–60 min';
  let description = 'Zbalansowane tempo wchłaniania węglowodanów dzięki obecności białka i tłuszczu.';

  if (score < 15) {
    tier = 'low';
    tierLabel = 'Niski wpływ glikemiczny — powolne wchłanianie i stabilna glikemia';
    estimatedPeakMinutes = 75;
    peakWindowLabel = 'Płaski szczyt po 60–90 min';
    description = 'Wysoki udział błonnika/białka znacząco spowalnia opróżnianie żołądka, zapobiegając gwałtownym wahaniom energii.';
  } else if (score > 32) {
    tier = 'high';
    tierLabel = 'Wysoki potencjał glikemiczny — szybkie uwalnianie glukozy';
    estimatedPeakMinutes = 35;
    peakWindowLabel = 'Wczesny szczyt po 30–45 min';
    description = 'Szybko przyswajalne węglowodany przy niższym udziale tłuszczu/błonnika. Korzystne okołotreningowo, przy braku ruchu może sprzyjać spadkowi energii.';
  }

  return {
    state: fiberUnknown ? 'provisional_unknown_fiber' : 'estimated',
    netCarbsGrams: netCarbs,
    glycemicImpactScore: score,
    tier,
    tierLabel,
    absorptionProfile: {
      estimatedPeakMinutes,
      peakWindowLabel,
      description,
    },
    nonDiagnosticNotice: NON_DIAGNOSTIC_NOTICE,
  };
}
