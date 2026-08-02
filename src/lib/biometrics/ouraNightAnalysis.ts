export interface OuraNightAnalysisDay {
  date: string;
  readiness_score: number | null;
  readiness_contributors: unknown;
}

interface OuraNightDriver {
  key: string;
  label: string;
  score: number;
  direction: 'up' | 'neutral' | 'down';
  source: 'Oura';
}

interface OuraRecoveryForecast {
  state: 'estimated' | 'calibrating';
  estimate: number | null;
  low: number | null;
  high: number | null;
  confidence: 'low' | 'medium' | 'high';
  reason: string;
}

export interface OuraNightAnalysis {
  state: 'measured' | 'calibrating';
  summary: string;
  drivers: OuraNightDriver[];
  forecast: OuraRecoveryForecast;
}

const DRIVER_LABELS: Record<string, string> = {
  activity_balance: 'bilans aktywności',
  body_temperature: 'temperatura ciała',
  hrv_balance: 'bilans HRV',
  previous_day_activity: 'aktywność poprzedniego dnia',
  previous_night: 'poprzednia noc',
  recovery_index: 'tempo regeneracji',
  resting_heart_rate: 'tętno spoczynkowe',
  sleep_balance: 'bilans snu',
  sleep_regularity: 'regularność snu',
};

function contributors(value: unknown): OuraNightDriver[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, number] => (
      typeof entry[1] === 'number' && Number.isFinite(entry[1])
    ))
    .map(([key, score]) => ({
      key,
      label: DRIVER_LABELS[key] ?? key.replaceAll('_', ' '),
      score: Math.round(score),
      direction: score >= 80 ? 'up' as const : score >= 65 ? 'neutral' as const : 'down' as const,
      source: 'Oura' as const,
    }))
    .sort((a, b) => a.score - b.score);
}

function recoveryForecast(
  history: OuraNightAnalysisDay[],
  todayStrain: number | null,
): OuraRecoveryForecast {
  const scores = history
    .map((day) => day.readiness_score)
    .filter((score): score is number => score != null)
    .slice(-14);
  if (scores.length < 3) {
    return {
      state: 'calibrating',
      estimate: null,
      low: null,
      high: null,
      confidence: 'low',
      reason: `Potrzeba jeszcze ${3 - scores.length} nocy z wynikiem gotowości.`,
    };
  }
  const recent = scores.slice(-7);
  const mean = recent.reduce((sum, score) => sum + score, 0) / recent.length;
  const strainPenalty = todayStrain == null ? 0 : Math.max(0, todayStrain - 10) * 0.6;
  const estimate = Math.max(0, Math.min(100, Math.round(mean - strainPenalty)));
  const variance = recent.reduce((sum, score) => sum + ((score - mean) ** 2), 0) / recent.length;
  const spread = Math.max(4, Math.round(Math.sqrt(variance) * 1.5));
  return {
    state: 'estimated',
    estimate,
    low: Math.max(0, estimate - spread),
    high: Math.min(100, estimate + spread),
    confidence: scores.length >= 14 ? 'high' : scores.length >= 7 ? 'medium' : 'low',
    reason: `Prognoza z ${scores.length} zapisanych nocy${todayStrain == null ? '' : ' i dzisiejszego obciążenia'}.`,
  };
}

export function buildOuraNightAnalysis(
  current: OuraNightAnalysisDay | null,
  history: OuraNightAnalysisDay[],
  todayStrain: number | null = null,
): OuraNightAnalysis {
  const drivers = contributors(current?.readiness_contributors);
  const weakest = drivers.find((driver) => driver.direction === 'down');
  const strongest = [...drivers].reverse().find((driver) => driver.direction === 'up');
  const summary = weakest
    ? `Największym ograniczeniem był ${weakest.label}.`
    : strongest
      ? `Najmocniej wspierała Cię ${strongest.label}.`
      : 'Potrzeba pełnych składowych Oura, aby wyjaśnić tę noc.';
  return {
    state: current && drivers.length > 0 ? 'measured' : 'calibrating',
    summary,
    drivers,
    forecast: recoveryForecast(history, todayStrain),
  };
}
