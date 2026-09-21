/**
 * @file workoutPlateCalculator.ts
 * @role Oblicza rozkład talerzy na stronę dla sztangi i maszyn (gryfy olimpijskie, EZ, Smith, Trap bar).
 * Dostępne nominały olimpijskie: 25, 20, 15, 10, 5, 2.5, 1.25 kg.
 */

export type BarType = 'olympic' | 'ez' | 'smith' | 'smith_counterbalanced' | 'trap' | 'custom';

export interface BarPreset {
  id: BarType;
  name: string;
  weightKg: number;
}

export const BAR_PRESETS: Record<BarType, BarPreset> = {
  olympic: { id: 'olympic', name: 'Gryf olimpijski', weightKg: 20 },
  ez: { id: 'ez', name: 'Gryf łamany EZ', weightKg: 10 },
  smith: { id: 'smith', name: 'Maszyna Smitha (standard)', weightKg: 9 },
  smith_counterbalanced: { id: 'smith_counterbalanced', name: 'Smith z przeciwwagą', weightKg: 0 },
  trap: { id: 'trap', name: 'Trap bar / Hex', weightKg: 25 },
  custom: { id: 'custom', name: 'Niestandardowy', weightKg: 20 },
};

export interface PlateBreakdown {
  plate: number;
  count: number;
}

export interface PlateCalculationResult {
  totalWeight: number;
  barWeight: number;
  weightPerSide: number;
  plates: PlateBreakdown[];
  remainder: number;
}

export const STANDARD_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export function resolveBarWeight(barWeightOrType: number | BarType = 20): number {
  if (typeof barWeightOrType === 'string') {
    return BAR_PRESETS[barWeightOrType]?.weightKg ?? 20;
  }
  return Number.isFinite(barWeightOrType) ? Math.max(0, barWeightOrType) : 20;
}

export function calculatePlates(
  totalWeight: number,
  barWeightOrType: number | BarType = 20,
  availablePlates = STANDARD_PLATES
): PlateCalculationResult {
  const barWeight = resolveBarWeight(barWeightOrType);

  if (totalWeight <= barWeight) {
    return {
      totalWeight,
      barWeight,
      weightPerSide: 0,
      plates: [],
      remainder: 0,
    };
  }

  const weightPerSide = (totalWeight - barWeight) / 2;
  let remaining = weightPerSide;
  const plates: PlateBreakdown[] = [];

  const sortedPlates = [...availablePlates].sort((a, b) => b - a);

  for (const plate of sortedPlates) {
    if (remaining >= plate) {
      const count = Math.floor(remaining / plate);
      plates.push({ plate, count });
      remaining = Math.round((remaining - count * plate) * 100) / 100;
    }
  }

  return {
    totalWeight,
    barWeight,
    weightPerSide,
    plates,
    remainder: remaining,
  };
}

/**
 * Zwraca czytelne tekstowe podsumowanie rozkładu talerzy na stronę.
 * Np. "Gryf 20 kg · 40 kg na stronę (25 kg, 15 kg)"
 */
export function formatPlateBreakdownSummary(result: PlateCalculationResult): string {
  if (result.weightPerSide <= 0) {
    return result.barWeight > 0 ? `Sam gryf (${result.barWeight} kg)` : 'Brak obciążenia';
  }

  const plateList = result.plates.flatMap((p) => Array(p.count).fill(`${p.plate} kg`)).join(' + ');

  return `Gryf ${result.barWeight} kg · ${result.weightPerSide} kg na stronę: [ ${plateList} ]`;
}
