/**
 * @component DailyStrainCard
 * @role Karta dobowego strain/recovery (DZIŚ tab) — spina Header/MetricsRow/VitalsRow.
 * @composes DailyStrainHeader, DailyStrainBrief, DailyStrainVitalsRow
 * @usedBy DashboardDzisTab (lazy)
 */
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import DataStateNotice from '../core/DataStateNotice';
import { STATUS_RING, type StrainComponents } from './dailyStrainCardStyles';
import { parseStrainComponents } from '../../lib/db-json-guards';
import { useDailyStrainCardData } from './hooks/useDailyStrainCardData';
import DailyStrainHeader from './DailyStrainHeader';
import DailyStrainBrief from './DailyStrainBrief';
import DailyStrainVitalsRow from './DailyStrainVitalsRow';

export default function DailyStrainCard({
  refreshSignal = 0,
}: {
  refreshSignal?: number
}) {
  const { userId, today, dailyQuery, refreshing, refresh } = useDailyStrainCardData(refreshSignal);
  const { data: dbData, isLoading: loading, error: queryError } = dailyQuery;
  const sourceErrors = dbData?.sourceErrors ?? [];
  const sourceNotice = sourceErrors.length ? <DataStateNotice tone="warning" title="Część źródeł zdrowia jest niedostępna" detail={sourceErrors.map((error) => `${error.source}: ${error.message}`).join(' · ')} /> : null;

  if (!userId) return null;

  if (loading) return <div className="card p-4"><DataStateNotice tone="loading" title="Obciążenie dnia się liczy" detail="Ładuje ostatni wynik obciążenia i regeneracji." /></div>;
  if (queryError) return <div className="card border-danger/20 p-4"><DataStateNotice tone="warning" title="Obciążenie niedostępne" detail={`Nie mogę odczytać danych: ${queryError.message}`} /></div>;
  if (!dbData?.row) return <div className="card p-4">{sourceNotice}{!sourceErrors.some((error) => error.source === 'daily_strain') && <DataStateNotice title="Brak danych obciążenia" detail="Zsynchronizuj Oura i Garmin przez Intervals.icu, a następnie przelicz obciążenie." />}</div>;

  const { row, oura, ouraYesterday, enhanced, enhancedYesterday } = dbData;
  const strainScore = row.strain_score;
  const recoveryScore = row.recovery_score;
  const provisionalFuelingLimiter = row.fueling_provisional && ['calories', 'carbs'].includes(row.main_limiter ?? '');
  const statusKey = provisionalFuelingLimiter ? 'unknown'
    : row.daily_status === 'red' ? 'red' : row.daily_status === 'yellow' ? 'yellow'
      : row.daily_status === 'green' && strainScore != null && recoveryScore != null ? 'green' : 'unknown';
  const missingMeasurements = row.strain_score == null || row.recovery_score == null;

  const isStale = row.date !== today;
  const hasMatchingOuraDay = oura?.date === row.date;
  const comp: StrainComponents = parseStrainComponents(row.components) ?? {};
  const {
    recovery_confidence: recConf,
    strain_confidence: strConf,
    sleep_debt_h: sleepDebtH,
    hrv_z: hrvZ,
    rhr_z: rhrZ,
    sleep_score_today: sleepScoreToday,
    sleep_z: sleepZ,
    readiness_signals: readinessSignals,
    wellness_load: wellnessLoad,
  } = comp;
  const readinessLevel = row.readiness_level;

  return (
    <div className={`relative overflow-hidden card rounded-3xl ${STATUS_RING[statusKey]} p-4 space-y-4`}>

      {sourceNotice}
      <DailyStrainHeader
        isStale={isStale}
        date={row.date}
        refreshing={refreshing}
        onRefresh={() => refresh(false)}
        preliminary={recConf === 'calibrating' || strConf === 'calibrating'}
      />

      <DailyStrainBrief
        level={readinessLevel}
        recoveryScore={recoveryScore}
        mainLimiter={provisionalFuelingLimiter ? null : row.main_limiter}
        signals={readinessSignals}
        sleepScore={sleepScoreToday}
        sleepDebtH={sleepDebtH}
      />

      {wellnessLoad != null && wellnessLoad > 0 && (
        <p className="text-xs text-text-muted relative z-[var(--z-raised)]">
          Sauna i zimno dodały <span className="font-semibold text-warning">{wellnessLoad}</span> pkt do dzisiejszego obciążenia.
        </p>
      )}

      {/* Oura measurements: the main numbers; extra detail sits behind the row's own toggle */}
      {oura && !hasMatchingOuraDay && <DataStateNotice title={`Oura · dane z ${oura.date}`} detail="Wynik regeneracji i poniższe pomiary pochodzą z różnych dni." />}
      {!oura && <DataStateNotice title="Brak pomiarów Oura" detail="Nie ma dostępnego podsumowania pomiarów z urządzenia." />}
      {oura && (
        <DailyStrainVitalsRow
          oura={oura}
          ouraYesterday={ouraYesterday}
          enhanced={enhanced}
          enhancedYesterday={enhancedYesterday}
          hrvZ={hasMatchingOuraDay ? hrvZ : null}
          rhrZ={hasMatchingOuraDay ? rhrZ : null}
          sleepZ={hasMatchingOuraDay ? sleepZ : null}
          sleepScoreToday={hasMatchingOuraDay ? sleepScoreToday : null}
        />
      )}

      {missingMeasurements && (
        <DataStateNotice title="Ocena przybliżona" detail="Brakuje części pomiarów z Oura, więc obciążenie albo regeneracja mogą być niepełne." />
      )}

      {/* Oura Health Hub Launcher Button */}
      <Link
        to="/oura"
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 px-4 text-xs font-bold text-primary border border-primary/20 bg-primary/[0.04] hover:bg-primary/[0.08] ui-interactive relative z-[var(--z-raised)]"
      >
        <Sparkles size={14} className="text-primary animate-pulse" />
        Pełny wgląd w sen i biometrię →
      </Link>
    </div>
  );
}


