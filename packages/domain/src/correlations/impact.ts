import { CorrelationCategory, CorrelationMethod, ScatterPoint, CorrelationResult } from './types.ts';
import { pearson, ALLOWED_OUTCOMES, isAllowedInput, areMetricsRedundant, correlationCI, checkSplitHalfStability, fdrCorrection } from './math.ts';

export function getControllability(metric: string): number {
  const m = metric.toLowerCase();
  if (
    m.includes('caffeine') || m.includes('coffee') ||
    m.includes('alcohol') || m.includes('alkohol') ||
    m.includes('meal') || m.includes('calories_late') ||
    m.includes('dinner') || /(^|_)lenie($|_)/.test(m) || m.includes('pmo') || m.includes('masturb') ||
    m.includes('bedtime') || m.includes('screen') ||
    m.includes('phone_drift') || m.includes('phone_active') ||
    m.includes('creatine') || m.includes('omega3') || m.includes('lions_mane') ||
    m.includes('d3') || m.startsWith('habit__') || m.includes('food_quality')
  ) {
    return 1.0;
  }
  if (m.includes('strain') || m.includes('steps') || m.includes('workout') || m.includes('run')) {
    return 0.4;
  }
  return 0.1;
}

export function computeNaturalEffect(
  xMetric: string,
  yMetric: string,
  scatter: ScatterPoint[]
): string {
  if (scatter.length < 5) return 'Brak danych';
  const uniqueX = new Set(scatter.map(p => p.x));
  const isBinary = uniqueX.size <= 3;

  let delta = 0;
  let description = '';

  if (isBinary) {
    const sortedX = Array.from(uniqueX).sort((a, b) => a - b);
    const midX = sortedX[Math.floor(sortedX.length / 2)];
    const groupHigh = scatter.filter(p => p.x >= midX).map(p => p.y);
    const groupLow = scatter.filter(p => p.x < midX).map(p => p.y);

    if (groupHigh.length >= 2 && groupLow.length >= 2) {
      const meanHigh = groupHigh.reduce((a, b) => a + b, 0) / groupHigh.length;
      const meanLow = groupLow.reduce((a, b) => a + b, 0) / groupLow.length;
      delta = meanHigh - meanLow;
    } else {
      delta = olsSlope(scatter.map(p => [p.x, p.y])) || 0;
    }
    description = 'z vs bez';
  } else {
    const xs = scatter.map(p => p.x);
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const stdX = Math.sqrt(xs.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0) / xs.length);
    const slope = olsSlope(scatter.map(p => [p.x, p.y])) || 0;
    delta = slope * stdX;
    description = `na każde +${stdX.toFixed(1)} jedn.`;
  }

  let formattedDelta = '';
  if (yMetric.includes('sleep_h') || yMetric === 'sleep_h' || yMetric === 'deep_sleep_h' || yMetric === 'rem_sleep_h') {
    const mins = Math.round(delta * 60);
    formattedDelta = `${mins > 0 ? '+' : ''}${mins} min`;
  } else if (yMetric.includes('score') || yMetric === 'readiness' || yMetric === 'recovery') {
    formattedDelta = `${delta > 0 ? '+' : ''}${delta.toFixed(1)} pkt`;
  } else if (yMetric === 'hrv' || yMetric === 'sleep_hrv') {
    formattedDelta = `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ms`;
  } else if (yMetric === 'rhr' || yMetric === 'sleep_lowest_hr') {
    formattedDelta = `${delta > 0 ? '+' : ''}${delta.toFixed(1)} bpm`;
  } else if (yMetric === 'plan_done_pct') {
    formattedDelta = `${delta > 0 ? '+' : ''}${Math.round(delta)}%`;
  } else if (yMetric === 'screen_time_min') {
    formattedDelta = `${delta > 0 ? '+' : ''}${Math.round(delta)} min`;
  } else if (yMetric === 'phone_drift') {
    formattedDelta = `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}% szans`;
  } else if (yMetric === 'weight_kg') {
    formattedDelta = `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`;
  } else {
    formattedDelta = `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`;
  }

  return `${formattedDelta} (${description})`;
}

function olsSlope(pairs: [number, number][]): number | null {
  const n = pairs.length;
  if (n < 3) return null;
  const xs = pairs.map(p => p[0]);
  const ys = pairs.map(p => p[1]);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0;
  for (const [x, y] of pairs) {
    sxx += (x - mx) * (x - mx);
    sxy += (x - mx) * (y - my);
  }
  return sxx > 0 ? sxy / sxx : null;
}

export interface ImpactFactor {
  id: string;
  x_metric: string;
  y_metric: string;
  x_label: string;
  y_label: string;
  lag_days: number;
  r: number;
  n: number;
  p: number;
  ci_lower: number;
  ci_upper: number;
  ci_crosses_zero: boolean;
  is_stable: boolean;
  evidence_level: 'confirmed' | 'probable' | 'hypothesis' | 'no_evidence';
  natural_effect: string;
  decision_value: number;
  scatter: ScatterPoint[];
  method: CorrelationMethod;
  category: CorrelationCategory;
}

export function classifyImpactFactors(results: CorrelationResult[]): ImpactFactor[] {
  const filtered = results.filter(r => {
    if (!isAllowedInput(r.x_metric) || !ALLOWED_OUTCOMES.has(r.y_metric)) return false;
    if (areMetricsRedundant(r.x_metric, r.y_metric)) return false;

    // Jev-curated statistical hygiene filters:
    // 1. Food quality negatively predicting plan execution (spurious artifact)
    if (r.x_metric === 'food_quality' && (r.y_metric === 'plan_done_pct' || r.y_metric === 'execution_score') && r.r < 0) {
      return false;
    }
    // 2. Bedtime hour linearly predicting sleep score (circular/modulo hour artifact)
    if (r.x_metric === 'bedtime_hour' && r.y_metric === 'sleep_score' && r.r > 0) {
      return false;
    }
    // 3. Late night calories claiming to improve plan execution (working late confounder)
    if (r.x_metric === 'calories_late' && (r.y_metric === 'execution_score' || r.y_metric === 'plan_done_pct') && r.r > 0) {
      return false;
    }

    return true;
  });

  const factors = filtered.map(r => {
    const ci = correlationCI(r.r, r.n);
    const isStable = checkSplitHalfStability(r.scatter);
    const naturalEffect = computeNaturalEffect(r.x_metric, r.y_metric, r.scatter);
    return {
      id: r.id,
      x_metric: r.x_metric,
      y_metric: r.y_metric,
      x_label: r.x_label,
      y_label: r.y_label,
      lag_days: r.lag_days,
      r: r.r,
      n: r.n,
      p: r.p,
      ci_lower: ci.lower,
      ci_upper: ci.upper,
      ci_crosses_zero: ci.crossesZero,
      is_stable: isStable,
      natural_effect: naturalEffect,
      scatter: r.scatter,
      method: r.method || 'pearson',
      category: r.category
    };
  });

  const pValues = factors.map(f => f.p);
  const fdrSignificant = fdrCorrection(pValues, 0.10);

  const classified: ImpactFactor[] = factors.map((f, idx) => {
    let tier: 'confirmed' | 'probable' | 'hypothesis' | 'no_evidence' = 'no_evidence';
    const isSignificant = fdrSignificant[idx];
    const rAbs = Math.abs(f.r);

    if (f.n >= 25 && isSignificant && !f.ci_crosses_zero && f.is_stable && rAbs >= 0.25) {
      tier = 'confirmed';
    } else if (f.n >= 12 && f.p < 0.05 && f.is_stable && rAbs >= 0.20) {
      tier = 'probable';
    } else if (f.n >= 8 && f.p < 0.15 && rAbs >= 0.15) {
      tier = 'hypothesis';
    }

    const controllability = getControllability(f.x_metric);
    const stabilityWeight = f.is_stable ? 1.0 : 0.2;
    const significanceWeight = tier === 'confirmed' ? 1.0 : tier === 'probable' ? 0.7 : tier === 'hypothesis' ? 0.4 : 0.1;
    
    const decisionValue = significanceWeight * rAbs * stabilityWeight * controllability;

    return {
      ...f,
      evidence_level: tier,
      decision_value: +decisionValue.toFixed(4)
    };
  });

  return classified.sort((a, b) => b.decision_value - a.decision_value);
}
