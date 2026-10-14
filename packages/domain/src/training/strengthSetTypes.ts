export type StrengthSetType = 'normal' | 'warmup' | 'dropset' | 'failure' | 'myo_rep';

export interface StrengthSetInput {
  id: string;
  exerciseId: string;
  exerciseName?: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  setType?: StrengthSetType;
  rpe?: number | null;
  supersetId?: string | null; // e.g. "SS1", "A1"
}

export interface StrengthSetSummary {
  totalSets: number;
  warmupSets: number;
  workingSets: number;
  dropsets: number;
  failureSets: number;
  totalTonnageKg: number;
  workingTonnageKg: number;
  fatigueIndex: number;
  supersetGroupsCount: number;
  setsByType: Record<StrengthSetType, number>;
  recommendation: string;
}

export const STRENGTH_SET_TYPE_LABELS: Record<StrengthSetType, { label: string; short: string; description: string }> = {
  normal: { label: 'Seria robocza', short: 'Rob.', description: 'Standardowa seria robocza w zaplanowanym zakresie RPE.' },
  warmup: { label: 'Rozgrzewkowa', short: 'Rozgrz.', description: 'Seria przygotowawcza. Nie wliczana do objętości efektywnej.' },
  dropset: { label: 'Dropset', short: 'Drop', description: 'Seria ze zrzutem ciężaru bez przerwy wypoczynkowej.' },
  failure: { label: 'Do załamania (RPE 10)', short: 'Załam.', description: 'Seria do wyczerpania mięśniowego. Generuje wysoki koszt zmęczeniowy.' },
  myo_rep: { label: 'Myo-reps', short: 'Myo', description: 'Miniserie w protokole rest-pause po serii aktywacyjnej.' },
};

/**
 * Calculates strength set classification, working volume and fatigue impact (Bevel Strength Set Classifier)
 */
export function analyzeStrengthSets(sets: StrengthSetInput[]): StrengthSetSummary {
  if (!sets || sets.length === 0) {
    return {
      totalSets: 0,
      warmupSets: 0,
      workingSets: 0,
      dropsets: 0,
      failureSets: 0,
      totalTonnageKg: 0,
      workingTonnageKg: 0,
      fatigueIndex: 0,
      supersetGroupsCount: 0,
      setsByType: { normal: 0, warmup: 0, dropset: 0, failure: 0, myo_rep: 0 },
      recommendation: 'Brak zarejestrowanych serii w sesji treningowej.',
    };
  }

  let warmupSets = 0;
  let dropsets = 0;
  let failureSets = 0;
  let totalTonnage = 0;
  let workingTonnage = 0;
  let fatigueScore = 0;

  const setsByType: Record<StrengthSetType, number> = {
    normal: 0,
    warmup: 0,
    dropset: 0,
    failure: 0,
    myo_rep: 0,
  };

  const supersetGroups = new Set<string>();

  for (const set of sets) {
    const type = set.setType || 'normal';
    setsByType[type] = (setsByType[type] || 0) + 1;

    const tonnage = Math.max(0, set.weightKg * set.reps);
    totalTonnage += tonnage;

    if (set.supersetId && set.supersetId.trim()) {
      supersetGroups.add(set.supersetId.trim());
    }

    if (type === 'warmup') {
      warmupSets++;
      fatigueScore += 0.2; // minimal fatigue
    } else {
      workingTonnage += tonnage;
      if (type === 'dropset') {
        dropsets++;
        fatigueScore += 1.3;
      } else if (type === 'failure') {
        failureSets++;
        fatigueScore += 1.5;
      } else if (type === 'myo_rep') {
        fatigueScore += 1.2;
      } else {
        fatigueScore += 1.0;
      }
    }
  }

  const workingSets = sets.length - warmupSets;
  const fatigueIndex = parseFloat(fatigueScore.toFixed(1));

  let recommendation = `Zrealizowano ${workingSets} serii roboczych (tonaże roboczy: ${Math.round(workingTonnage)} kg).`;
  if (failureSets >= 4) {
    recommendation += ' Wysoki udział serii do załamania wydłuży czas pełnej regeneracji układu nerwowego do 48-72h.';
  } else if (dropsets >= 2) {
    recommendation += ' Zastosowano techniki intensyfikacji (dropsety) o wysokiej gęstości metabolicznej.';
  }

  return {
    totalSets: sets.length,
    warmupSets,
    workingSets,
    dropsets,
    failureSets,
    totalTonnageKg: Math.round(totalTonnage),
    workingTonnageKg: Math.round(workingTonnage),
    fatigueIndex,
    supersetGroupsCount: supersetGroups.size,
    setsByType,
    recommendation,
  };
}
