/**
 * @file personalBests.ts
 * @role Sala Rekordów Życiowych (PR Trophy Room / Personal Bests) w stylu Bevel Health.
 * Identyfikuje i zestawia rekordy życiowe w biegach, bojach siłowych oraz wskaźnikach biometrycznych (HRV, RHR).
 */

export interface RunningPB {
  distanceLabel: '1 km' | '5 km' | '10 km' | 'Półmaraton' | 'Maraton';
  targetMeters: number;
  timeSeconds: number;
  paceStr: string;           // "MM:SS /km"
  achievedAt: string;        // YYYY-MM-DD
  activityName?: string;
}

export interface StrengthPB {
  liftKey: string;
  liftName: string;
  weightKg: number;
  reps: number;
  estimated1RM: number;
  achievedAt: string;
}

export interface BiometricPB {
  metricKey: 'highest_hrv' | 'lowest_rhr' | 'longest_deep_sleep' | 'highest_strain';
  label: string;
  value: number;
  unit: string;
  achievedAt: string;
  contextNote?: string;
}

export interface PersonalBestsSummary {
  running: RunningPB[];
  strength: StrengthPB[];
  biometrics: BiometricPB[];
  totalRecordsCount: number;
  recentRecord?: {
    category: 'running' | 'strength' | 'biometric';
    title: string;
    achievedAt: string;
  };
}

export interface RawActivityForPB {
  distance?: number | null;     // metry
  moving_time?: number | null;  // sekundy
  start_date?: string | null;   // ISO
  name?: string | null;
  sport_type?: string | null;
}

export interface RawBiometricsForPB {
  date: string;
  hrv?: number | null;
  resting_hr?: number | null;
  deep_sleep_minutes?: number | null;
  strain?: number | null;
}

function formatPace(seconds: number, distanceMeters: number): string {
  if (distanceMeters <= 0 || seconds <= 0) return '—';
  const secPerKm = seconds / (distanceMeters / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s < 10 ? '0' : ''}${s} /km`;
}

/**
 * Wyciąga najlepsze czasy dla standardowych dystansów biegowych z historii aktywności.
 */
export function extractRunningPBs(activities: RawActivityForPB[]): RunningPB[] {
  const targets: Array<{ label: RunningPB['distanceLabel']; meters: number; tolerancePct: number }> = [
    { label: '1 km', meters: 1000, tolerancePct: 0.15 },
    { label: '5 km', meters: 5000, tolerancePct: 0.10 },
    { label: '10 km', meters: 10000, tolerancePct: 0.08 },
    { label: 'Półmaraton', meters: 21097, tolerancePct: 0.05 },
  ];

  const results: RunningPB[] = [];

  for (const t of targets) {
    let bestTime: number | null = null;
    let bestAct: RawActivityForPB | null = null;

    for (const act of activities) {
      if (!act.distance || !act.moving_time || !act.start_date) continue;
      // Dopuszczalny zakres dystansu
      const minDistance = t.meters * (1 - t.tolerancePct);
      const maxDistance = t.meters * (1 + t.tolerancePct);

      if (act.distance >= minDistance && act.distance <= maxDistance) {
        // Przelicz czas proporcjonalnie do dokładnego dystansu docelowego
        const estimatedTargetTime = (act.moving_time / act.distance) * t.meters;
        if (bestTime === null || estimatedTargetTime < bestTime) {
          bestTime = Math.round(estimatedTargetTime);
          bestAct = act;
        }
      }
    }

    if (bestTime !== null && bestAct?.start_date) {
      results.push({
        distanceLabel: t.label,
        targetMeters: t.meters,
        timeSeconds: bestTime,
        paceStr: formatPace(bestTime, t.meters),
        achievedAt: bestAct.start_date.slice(0, 10),
        activityName: bestAct.name || 'Bieg',
      });
    }
  }

  return results;
}

/**
 * Wyciąga rekordy biometryczne (najwyższe HRV, najniższe RHR, najdłuższy deep sleep).
 */
export function extractBiometricPBs(records: RawBiometricsForPB[]): BiometricPB[] {
  const result: BiometricPB[] = [];

  let highestHrv: { val: number; date: string } | null = null;
  let lowestRhr: { val: number; date: string } | null = null;
  let longestDeep: { val: number; date: string } | null = null;
  let highestStrain: { val: number; date: string } | null = null;

  for (const r of records) {
    if (r.hrv && r.hrv > 0 && r.hrv < 300 && (highestHrv === null || r.hrv > highestHrv.val)) {
      highestHrv = { val: Math.round(r.hrv), date: r.date };
    }
    if (r.resting_hr && r.resting_hr > 30 && r.resting_hr < 130 && (lowestRhr === null || r.resting_hr < lowestRhr.val)) {
      lowestRhr = { val: Math.round(r.resting_hr), date: r.date };
    }
    if (r.deep_sleep_minutes && r.deep_sleep_minutes > 0 && r.deep_sleep_minutes < 420 && (longestDeep === null || r.deep_sleep_minutes > longestDeep.val)) {
      longestDeep = { val: Math.round(r.deep_sleep_minutes), date: r.date };
    }
    if (r.strain && r.strain > 0 && r.strain <= 21 && (highestStrain === null || r.strain > highestStrain.val)) {
      highestStrain = { val: Math.round(r.strain * 10) / 10, date: r.date };
    }
  }

  if (highestHrv) {
    result.push({
      metricKey: 'highest_hrv',
      label: 'Najwyższe HRV nocne',
      value: highestHrv.val,
      unit: 'ms',
      achievedAt: highestHrv.date,
      contextNote: 'Szczytowa adaptacja przywspółczulna',
    });
  }

  if (lowestRhr) {
    result.push({
      metricKey: 'lowest_rhr',
      label: 'Najniższe tętno spoczynkowe (RHR)',
      value: lowestRhr.val,
      unit: 'bpm',
      achievedAt: lowestRhr.date,
      contextNote: 'Wysoka ekonomia układu krążenia',
    });
  }

  if (longestDeep) {
    result.push({
      metricKey: 'longest_deep_sleep',
      label: 'Najdłuższy sen głęboki (Deep/SWS)',
      value: longestDeep.val,
      unit: 'min',
      achievedAt: longestDeep.date,
      contextNote: 'Maksymalny wyrzut hormonu wzrostu',
    });
  }

  if (highestStrain) {
    result.push({
      metricKey: 'highest_strain',
      label: 'Maksymalny dzienny Strain',
      value: highestStrain.val,
      unit: '/21',
      achievedAt: highestStrain.date,
      contextNote: 'Najcięższa zarejestrowana sesja',
    });
  }

  return result;
}

/**
 * Zbiorcze podsumowanie sali rekordów życiowych.
 */
export function buildPersonalBestsSummary(
  running: RunningPB[],
  strength: StrengthPB[],
  biometrics: BiometricPB[]
): PersonalBestsSummary {
  const totalRecordsCount = running.length + strength.length + biometrics.length;

  // Znajdź najświeższy rekord wg daty
  let recentRecord: PersonalBestsSummary['recentRecord'];
  let latestDate = '';

  for (const r of running) {
    if (r.achievedAt > latestDate) {
      latestDate = r.achievedAt;
      recentRecord = { category: 'running', title: `${r.distanceLabel} (${r.paceStr})`, achievedAt: r.achievedAt };
    }
  }
  for (const s of strength) {
    if (s.achievedAt > latestDate) {
      latestDate = s.achievedAt;
      recentRecord = { category: 'strength', title: `${s.liftName} (${s.weightKg} kg)`, achievedAt: s.achievedAt };
    }
  }
  for (const b of biometrics) {
    if (b.achievedAt > latestDate) {
      latestDate = b.achievedAt;
      recentRecord = { category: 'biometric', title: `${b.label} (${b.value} ${b.unit})`, achievedAt: b.achievedAt };
    }
  }

  return {
    running,
    strength,
    biometrics,
    totalRecordsCount,
    recentRecord,
  };
}
