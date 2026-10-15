/**
 * @file energyBank.ts
 * @role Obliczanie rezerwy energii (Energy Bank / Body Battery 0-100%) oraz statystyk dziennego stresu
 * na podstawie danych fizjologicznych Oura i obciążenia treningowego Sparky.
 */

export interface EnergyBankInput {
  recoveryScore: number | null | undefined;
  sleepScore: number | null | undefined;
  strainScore: number | null | undefined;
  stressScore?: number | null | undefined;
  stressHighMinutes?: number | null | undefined;
  recoveryHighMinutes?: number | null | undefined;
  stressDaySummary?: string | null | undefined;
}

export interface StressStats {
  current: number;
  highest: number;
  lowest: number;
  average: number;
  category: 'low' | 'med' | 'high';
  categoryLabel: string;
}

export interface EnergyBankResult {
  energyBank: number; // 0 - 100%
  baselineEnergy: number;
  strainDrain: number;
  stressDrain: number;
  restorationGain: number;
  stress: StressStats;
  explanation: string;
}

export function computeEnergyBank(input?: EnergyBankInput | null): EnergyBankResult {
  const safeInput = input || { recoveryScore: 70, sleepScore: 70, strainScore: 0 };
  const rec = typeof safeInput.recoveryScore === 'number' && Number.isFinite(safeInput.recoveryScore)
    ? Math.max(0, Math.min(100, safeInput.recoveryScore))
    : 70; // fallback standardowy
  const sleep = typeof safeInput.sleepScore === 'number' && Number.isFinite(safeInput.sleepScore)
    ? Math.max(0, Math.min(100, safeInput.sleepScore))
    : 70;

  // Poranny start baterii: ważona kombinacja regeneracji (60%) i jakości snu (40%)
  const baselineEnergy = Math.round(0.6 * rec + 0.4 * sleep);

  // Drenaż z aktywności fizycznej (Strain 0-21)
  const strain = typeof safeInput.strainScore === 'number' && Number.isFinite(safeInput.strainScore)
    ? Math.max(0, Math.min(21, safeInput.strainScore))
    : 0;
  // Każdy punkt Strain drenuje ~2.6% baterii (Strain 15 drenuje ~39% baterii)
  const strainDrain = Math.round(strain * 2.6);

  // Drenaż ze stresu dziennego
  const stressMinutes = Math.max(0, Number(safeInput.stressHighMinutes) || 0);
  const stressScoreVal = typeof safeInput.stressScore === 'number' && Number.isFinite(safeInput.stressScore)
    ? Math.max(0, Math.min(100, safeInput.stressScore))
    : (safeInput.stressDaySummary === 'stressful' ? 65 : safeInput.stressDaySummary === 'restored' ? 20 : 35);

  // Godzina wysokiego stresu drenuje ~8% baterii; dodatkowo bazowy drenaż ze wskaźnika stresu
  const stressDrainFromMinutes = Math.round((stressMinutes / 60) * 8);
  const stressDrainFromScore = Math.round((stressScoreVal / 100) * 14);
  const stressDrain = Math.min(45, stressDrainFromMinutes + stressDrainFromScore);

  // Regeneracja w ciągu dnia (Restorative Time)
  const recoveryMinutes = Math.max(0, Number(safeInput.recoveryHighMinutes) || 0);
  const restorationGain = Math.min(20, Math.round((recoveryMinutes / 60) * 5));

  // Ostateczny stan baterii (0 - 100)
  const energyBank = Math.max(5, Math.min(100, baselineEnergy - strainDrain - stressDrain + restorationGain));

  // Statystyki stresu
  const currentStress = stressScoreVal;
  // Szacunki highest/lowest wokół średniej, jeśli brak bezpośredniego loga próbek
  const highest = Math.min(99, Math.max(currentStress, Math.round(currentStress * 1.35 + 10)));
  const lowest = Math.max(2, Math.min(currentStress, Math.round(currentStress * 0.35)));
  const average = Math.round((highest + lowest + currentStress * 2) / 4);

  let category: 'low' | 'med' | 'high' = 'med';
  let categoryLabel = 'Umiarkowany';
  if (currentStress <= 25) {
    category = 'low';
    categoryLabel = 'Niski';
  } else if (currentStress >= 60) {
    category = 'high';
    categoryLabel = 'Wysoki';
  }

  let explanation = 'Poziom energii w normie.';
  if (energyBank < 30) {
    explanation = 'Rezerwa energii niska. Skup się na wyciszeniu i wczesnym śnie.';
  } else if (energyBank > 70) {
    explanation = 'Wysoki zasób energii. Pełna gotowość do realizacji zadań.';
  } else {
    explanation = 'Umiarkowany zapas energii. Dobry moment na planowy trening lub pracę.';
  }

  return {
    energyBank,
    baselineEnergy,
    strainDrain,
    stressDrain,
    restorationGain,
    stress: {
      current: currentStress,
      highest,
      lowest,
      average,
      category,
      categoryLabel,
    },
    explanation,
  };
}
