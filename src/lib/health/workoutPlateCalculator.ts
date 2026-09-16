/**
 * @file workoutPlateCalculator.ts
 * @role Oblicza rozkład talerzy na stronę dla sztangi (domyślnie gryf 20 kg).
 * Dostępne nominały olimpijskie: 25, 20, 15, 10, 5, 2.5, 1.25 kg.
 */

interface PlateBreakdown {
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

const STANDARD_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export function calculatePlates(
  totalWeight: number,
  barWeight = 20,
  availablePlates = STANDARD_PLATES
): PlateCalculationResult {
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
