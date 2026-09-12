import { useMemo } from 'react';
import { classifyImpactFactors } from '@vanguard/domain';
import { useUserId } from '../../../store/useStore';
import { useCorrelationsQuery } from '../../../lib/correlationsApi';

const COVERAGE_HINTS: Record<string, { label: string; action: string }> = {
  caffeine_mg:         { label: 'Kofeina (mg)', action: 'Loguj kawę w posiłkach z godziną (logged_at)' },
  last_coffee_hour:    { label: 'Godzina kawy', action: 'Loguj kawę z timestampem w posiłkach' },
  last_meal_hour:      { label: 'Godzina ostatniego posiłku', action: 'Loguj posiłki z dokładną godziną' },
  caffeine_late_mg:    { label: 'Kofeina po 14:00', action: 'Kawa z timestampem po południu' },
  workout_hr_peak:     { label: 'Tętno max na treningu', action: 'Treningi z pulsem (Oura sync)' },
  run_hr_avg:          { label: 'Średnie tętno biegu', action: 'Biegi Strava z pulsem' },
  deep_sleep_h:        { label: 'Sen głęboki', action: 'Sync Oura — fazy snu' },
  rem_sleep_h:         { label: 'Sen REM', action: 'Sync Oura enhanced — fazy snu' },
  sleep_efficiency:    { label: 'Efektywność snu', action: 'Sync Oura enhanced' },
  bedtime_hour:        { label: 'Godzina pójścia spać', action: 'Oura — godzina zaśnięcia' },
  supplement_creatine: { label: 'Kreatyna', action: 'Log suplementów → kreatyna' },
  supplement_omega3:   { label: 'Omega-3', action: 'Log suplementów → omega-3' },
  phone_active_hours:  { label: 'Czas ekranu', action: 'ActivityWatch sync' },
  productivity_ratio:  { label: 'Produktywność ekranu', action: 'ActivityWatch — stosunek produktywności' },
  habit_count:         { label: 'Nawyki dzienne', action: 'Uzupełniaj nawyki w app codziennie' },
  food_quality:        { label: 'Jakość jedzenia', action: 'Oceniaj jakość posiłków po zapisaniu' },
  insulin_load:        { label: 'Insulin load', action: 'Loguj posiłki z dokładnymi produktami' },
};

const NEEDED_DAYS = 25;

export function useCorrelationsData() {
  const userId = useUserId();

  // Always exclude weak — weak signals are noise, not insight
  const query = useCorrelationsQuery(userId, false);
  const correlations = useMemo(() => query.data?.correlations ?? [], [query.data]);
  const coverage = useMemo(() => query.data?.coverage ?? {}, [query.data]);
  const stats = query.data?.stats ?? null;
  const loading = query.isLoading;
  const error = query.error
    ? (query.error instanceof Error ? query.error.message : 'Błąd ładowania')
    : null;
  const load = query.refetch;

  const impactFactors = useMemo(() => classifyImpactFactors(correlations), [correlations]);

  const confirmedFactors = useMemo(
    () => impactFactors.filter(f => f.evidence_level === 'confirmed'),
    [impactFactors]
  );

  const probableFactors = useMemo(
    () => impactFactors.filter(f => f.evidence_level === 'probable'),
    [impactFactors]
  );

  const hypotheses = useMemo(
    () => impactFactors.filter(f => f.evidence_level === 'hypothesis').slice(0, 4),
    [impactFactors]
  );

  // Strong signals = confirmed + probable, sorted by decision_value (already sorted by classifyImpactFactors)
  const strongSignals = useMemo(
    () => [...confirmedFactors, ...probableFactors],
    [confirmedFactors, probableFactors]
  );

  const sparseMetrics = useMemo(() =>
    Object.entries(coverage)
      .filter(([k, n]) => n > 0 && n < NEEDED_DAYS && COVERAGE_HINTS[k])
      .map(([k, n]) => ({
        key: k,
        n,
        label: COVERAGE_HINTS[k].label,
        action: COVERAGE_HINTS[k].action,
        needed: NEEDED_DAYS - n,
        pct: Math.round((n / NEEDED_DAYS) * 100),
      }))
      .sort((a, b) => b.pct - a.pct) // most complete first
      .slice(0, 5),
  [coverage]);

  // Days of data available: approximate from coverage max value
  const daysOfData = useMemo(() => {
    const vals = Object.values(coverage);
    return vals.length > 0 ? Math.max(...vals) : 0;
  }, [coverage]);

  return {
    userId,
    impactFactors,
    strongSignals,
    hypotheses,
    stats,
    loading,
    error,
    load,
    sparseMetrics,
    daysOfData,
  };
}
