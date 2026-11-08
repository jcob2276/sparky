import { clamp, mean, sampleSD } from './baselines.ts';

export type ReadinessLevel = 'primed' | 'balanced' | 'strained' | 'rundown' | 'insufficient';
type SignalFlag = 'good' | 'neutral' | 'watch' | 'bad';

export interface ReadinessSignal {
  key: string;
  flag: SignalFlag;
  detail: string;
  /** Odchylenie od Twojej normy (dodatnie = lepiej niż zwykle). */
  z?: number;
  /** Kara za ten sygnał przed ważeniem: 0 = bez znaczenia, 1 = wyraźnie źle, maks. 1,5. */
  penalty?: number;
}

export interface ReadinessDay {
  date: string;
  hrv: number | null;
  rhr: number | null;
  respRate: number | null;
  strain: number | null;
}

/** Sygnały policzone gdzie indziej (wynik regeneracji), żeby werdykt i regeneracja używały tej samej bazy. */
export interface ReadinessEvidence {
  /** Z-score (dodatni = lepiej) względem bazy EWMA, ten sam co w wyniku regeneracji. */
  hrvZ?: number | null;
  rhrZ?: number | null;
  sleepScoreZ?: number | null;
  /** O ile godzin dług snu jest większy niż Twoja zwykła wartość z 4 tygodni (dodatnie = gorzej). */
  sleepDebtExcessH?: number | null;
}

/**
 * Poziom gotowości z sumy ważonych kar. Kara rośnie liniowo od ZERO_BELOW do FULL_AT odchyleń poniżej normy,
 * więc jedna wartość tuż za progiem ledwo się liczy, a kilka umiarkowanych sygnałów się sumuje.
 */
const READINESS_CONFIG = {
  /** Odchylenia poniżej normy, do których sygnał nic nie waży. */
  zeroBelowZ: 0.5,
  /** Odchylenia poniżej normy, przy których kara jest pełna (1,0). */
  fullAtZ: 1.5,
  maxPenalty: 1.5,
  weights: { hrv: 2, rhr: 1.5, sleepScore: 1, sleepDebt: 1, respRate: 1, acwr: 1.5 } as Record<string, number>,
  // Progi dobrane na 90 dniach własnych danych: ~15% dni „dziś lżej”, ~5% „odpoczywaj”.
  strainedAt: 1.5,
  rundownAt: 3.5,
  primedBelow: 0.5,
  /** Dług snu: godziny ponad zwykły poziom, od których zaczyna ważyć, i przy których kara jest pełna. */
  debtExcessStartH: 1,
  debtExcessFullH: 4,
  /** Minimalna względna zmiana HRV i tętna, poniżej której odchylenie traktujemy jak szum pomiaru. */
  minRelativeChange: { hrv: 0.04, rhr: 0.02 } as Record<string, number>,
};

const penaltyFromZ = (zWorse: number): number => {
  const c = READINESS_CONFIG;
  return clamp((zWorse - c.zeroBelowZ) / (c.fullAtZ - c.zeroBelowZ), 0, c.maxPenalty);
};

const flagFrom = (z: number, penalty: number): SignalFlag =>
  penalty >= 1 ? 'bad' : penalty >= 0.3 ? 'watch' : z >= 0.5 ? 'good' : 'neutral';

const round2 = (v: number) => Math.round(v * 100) / 100;

export function computeReadiness(
  days: ReadinessDay[],
  today: string,
  evidence: ReadinessEvidence = {},
): { level: ReadinessLevel; signals: ReadinessSignal[]; penalty: number } {
  const BASELINE_WINDOW = 30;
  const MIN_BASELINE = 7;
  const ACUTE_WINDOW = 7;
  const CHRONIC_WINDOW = 28;
  const MIN_CHRONIC = 14;
  const c = READINESS_CONFIG;

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.find((d) => d.date === today) ?? sorted[sorted.length - 1];
  if (!latest) return { level: 'insufficient', signals: [], penalty: 0 };

  const history = sorted.filter((d) => d.date < latest.date);
  const signals: ReadinessSignal[] = [];
  let total = 0;
  const add = (signal: ReadinessSignal, weighted: boolean) => {
    signals.push(signal);
    if (weighted && signal.penalty) total += (c.weights[signal.key] ?? 1) * signal.penalty;
  };

  /** Sygnał „im wyżej tym lepiej” (HRV) albo „im niżej tym lepiej” (tętno), z-score z bazy EWMA albo z 30 dni. */
  const zSignal = (
    key: 'hrv' | 'rhr',
    val: number | null,
    baseline: number[],
    higherBetter: boolean,
    externalZ: number | null | undefined,
    [good, neutral, watch, bad]: [string, string, string, string],
  ) => {
    let z: number | null = null;
    if (externalZ != null && Number.isFinite(externalZ)) {
      z = externalZ;
    } else if (val != null && baseline.length >= MIN_BASELINE) {
      const m = mean(baseline);
      const sd = sampleSD(baseline);
      if (m != null && sd != null) {
        // Podłoga rozrzutu: bardzo stabilna seria nie może robić z drobnej zmiany „wyraźnego odchylenia”.
        const floorSd = m * (key === 'hrv' ? 0.06 : 0.03);
        z = (higherBetter ? val - m : m - val) / Math.max(sd, floorSd);
        // Odchylenie mniejsze niż szum pomiaru nie jest sygnałem.
        if (m > 0 && Math.abs(val - m) / m < c.minRelativeChange[key]) z = Math.max(z, 0);
      }
    }
    if (z == null) return;
    const penalty = round2(penaltyFromZ(-z));
    const flag = flagFrom(z, penalty);
    add({ key, flag, z: round2(z), penalty, detail: flag === 'good' ? good : flag === 'neutral' ? neutral : flag === 'watch' ? watch : bad }, true);
  };

  const hrvBase = history.slice(-BASELINE_WINDOW).map((d) => d.hrv).filter((v): v is number => v != null);
  const rhrBase = history.slice(-BASELINE_WINDOW).map((d) => d.rhr).filter((v): v is number => v != null);

  zSignal('hrv', latest.hrv, hrvBase, true, evidence.hrvZ, [
    'powyżej baseline — dobrze zregenerowany',
    'w normalnym zakresie',
    'lekko poniżej baseline',
    'wyraźnie poniżej — zmęczenie autonomiczne',
  ]);

  zSignal('rhr', latest.rhr, rhrBase, false, evidence.rhrZ, [
    'poniżej lub na poziomie baseline',
    'w normalnym zakresie',
    'lekko powyżej baseline',
    'podwyższony — przetrenowanie lub choroba',
  ]);

  if (evidence.sleepScoreZ != null && Number.isFinite(evidence.sleepScoreZ)) {
    const z = evidence.sleepScoreZ;
    const penalty = round2(penaltyFromZ(-z));
    const flag = flagFrom(z, penalty);
    add({ key: 'sleepScore', flag, z: round2(z), penalty, detail: flag === 'bad' ? 'sen wyraźnie gorszy niż zwykle' : flag === 'watch' ? 'sen nieco gorszy niż zwykle' : 'sen w Twojej normie' }, true);
  }

  if (evidence.sleepDebtExcessH != null && Number.isFinite(evidence.sleepDebtExcessH)) {
    const excess = evidence.sleepDebtExcessH;
    const penalty = round2(clamp((excess - c.debtExcessStartH) / (c.debtExcessFullH - c.debtExcessStartH), 0, c.maxPenalty));
    const flag: SignalFlag = penalty >= 1 ? 'bad' : penalty >= 0.3 ? 'watch' : 'neutral';
    add({ key: 'sleepDebt', flag, penalty, z: round2(-excess), detail: penalty > 0 ? `dług snu o ${excess.toFixed(1)} h większy niż zwykle` : 'dług snu nie większy niż zwykle' }, true);
  }

  const respBase = history.slice(-BASELINE_WINDOW).map((d) => d.respRate).filter((v): v is number => v != null);
  const respSD = sampleSD(respBase);
  const respMean = mean(respBase);
  if (latest.respRate != null && respBase.length >= MIN_BASELINE && respSD != null && respSD > 0 && respMean != null) {
    const z = (latest.respRate - respMean) / respSD;
    const penalty = round2(penaltyFromZ(z));
    if (penalty >= 0.3) {
      const flag = flagFrom(-z, penalty);
      add({ key: 'respRate', flag, z: round2(-z), penalty, detail: flag === 'bad' ? 'oddech powyżej baseline — możliwy wczesny sygnał choroby' : 'oddech lekko powyżej baseline' }, true);
    }
  }

  const strainVals = sorted
    .map((d) => d.strain)
    .filter((v): v is number => v != null && Number.isFinite(v));

  if (strainVals.length >= MIN_CHRONIC) {
    const acute = mean(strainVals.slice(-ACUTE_WINDOW))!;
    const chronic = mean(strainVals.slice(-CHRONIC_WINDOW))!;
    if (chronic > 0) {
      const ratio = acute / chronic;
      const pr = ratio.toFixed(2);
      const penalty = round2(clamp((ratio - 1.3) / 0.4, 0, c.maxPenalty));
      if (ratio < 0.8) {
        add({ key: 'acwr', flag: 'watch', detail: `load spada (ACWR ${pr}) — przestrzeń do budowania` }, false);
      } else if (ratio < 1.3) {
        add({ key: 'acwr', flag: 'good', detail: `load w sweet spot (ACWR ${pr})` }, false);
      } else {
        add({ key: 'acwr', flag: penalty >= 1 ? 'bad' : 'watch', penalty, detail: penalty >= 1 ? `SPIKE (ACWR ${pr}) — ryzyko kontuzji` : `load rośnie szybko (ACWR ${pr}) — obserwuj` }, true);
      }
    }
    const week = strainVals.slice(-ACUTE_WINDOW);
    const wm = mean(week);
    const wSD = sampleSD(week);
    if (week.length >= 4 && wm != null && wSD != null) {
      if (wSD > 0 && wm / wSD >= 2.0) {
        add({ key: 'monotony', flag: 'watch', detail: 'niska zmienność — zbyt podobny bodziec każdego dnia' }, false);
      }
    }
  }

  if (!history.length || !signals.length) return { level: 'insufficient', signals, penalty: 0 };

  const penalty = round2(total);
  const good = signals.filter((s) => s.flag === 'good').length;
  // Blokują „gotowy na mocny dzień” tylko sygnały, które coś ważą; informacje o rytmie obciążeń nie.
  const watchOrBad = signals.filter((s) => (s.flag === 'watch' || s.flag === 'bad') && s.penalty != null).length;

  let level: ReadinessLevel;
  if (penalty >= c.rundownAt) level = 'rundown';
  else if (penalty >= c.strainedAt) level = 'strained';
  else if (good >= 2 && watchOrBad === 0 && penalty < c.primedBelow) level = 'primed';
  else level = 'balanced';

  return { level, signals, penalty };
}
