/**
 * @component DailyStrainCard
 * @role Karta dobowego strain/recovery (DZIŚ tab) — spina Header/MetricsRow/VitalsRow.
 * @composes DailyStrainHeader, DailyStrainMetricsRow, DailyStrainVitalsRow
 * @usedBy DashboardDzisTab (lazy)
 */
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import DataStateNotice from '../core/DataStateNotice';
import { SIGNAL_PILL, STATUS_RING, STATUS_GLOW, type StrainComponents } from './dailyStrainCardStyles';
import { parseStrainComponents } from '../../lib/db-json-guards';
import { useDailyStrainCardData } from './hooks/useDailyStrainCardData';
import DailyStrainHeader from './DailyStrainHeader';
import DailyStrainMetricsRow from './DailyStrainMetricsRow';
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
  const strainTone = strainScore == null ? 'text-text-muted' : strainScore >= 15 ? 'text-warning dark:text-warning' : strainScore >= 8 ? 'text-text-primary' : 'text-text-secondary';
  const recovTone = recoveryScore == null ? 'text-text-muted' : recoveryScore >= 75 ? 'text-success dark:text-success' : recoveryScore >= 55 ? 'text-warning dark:text-warning' : 'text-danger dark:text-danger';
  const provisionalFuelingLimiter = row.fueling_provisional && ['calories', 'carbs'].includes(row.main_limiter ?? '');
  const statusKey = provisionalFuelingLimiter ? 'unknown'
    : row.daily_status === 'red' ? 'red' : row.daily_status === 'yellow' ? 'yellow'
      : row.daily_status === 'green' && strainScore != null && recoveryScore != null ? 'green' : 'unknown';
  const missingSignals = [
    row.strain_score == null ? 'strain niepoliczony' : null,
    row.recovery_score == null ? 'recovery bez danych Oura' : null,
    row.fueling_score == null ? 'fueling niepoliczony' : null,
    statusKey === 'unknown' ? 'status dnia nieustalony' : null,
  ].filter(Boolean);

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
  const strainExplanation = provisionalFuelingLimiter ? null : row.explanation;

  return (
    <div className={`relative overflow-hidden card ${STATUS_RING[statusKey]} p-3.5 space-y-3`}>
      <div className={`absolute right-0 top-0 h-16 w-16 blur-[var(--blur-3xl)] ${STATUS_GLOW[statusKey]}`} />

      {sourceNotice}
      <DailyStrainHeader
        isStale={isStale}
        date={row.date}
        refreshing={refreshing}
        onRefresh={() => refresh(false)}
        readinessLevel={readinessLevel}
        strConf={strConf}
        recConf={recConf}
      />

      {/* Explanation */}
      {strainExplanation && (
        <p className="text-xs text-text-secondary leading-relaxed relative z-[var(--z-raised)]">{strainExplanation}</p>
      )}

      {wellnessLoad != null && wellnessLoad > 0 && (
        <p className="text-2xs text-text-muted relative z-[var(--z-raised)]">
          Wellness (sauna / zimno): <span className="font-bold text-warning">{wellnessLoad}</span> pkt w strain
        </p>
      )}

      {/* Signal pills */}
      {readinessSignals && readinessSignals.length > 0 && (
        <div className="flex flex-wrap gap-1 relative z-[var(--z-raised)]">
          {readinessSignals.map((s) => (
            <span key={s.key} className={`inline-flex rounded-lg border px-1.5 py-0.5 text-2xs font-bold ${SIGNAL_PILL[s.flag] ?? SIGNAL_PILL.neutral}`}>
              {s.detail}
            </span>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-border-custom/30 relative z-[var(--z-raised)]" />

      {/* Mini metrics row: Strain | Recovery | [Fueling] | [Sleep debt] */}
      <DailyStrainMetricsRow
        strainScore={strainScore}
        strainTone={strainTone}
        recoveryScore={recoveryScore}
        recovTone={recovTone}
        fuelingScore={row.fueling_score}
        fuelingProvisional={row.fueling_provisional}
        sleepDebtH={sleepDebtH}
      />

      {/* Oura vitals */}
      {oura && !hasMatchingOuraDay && <DataStateNotice title={`Oura · dane z ${oura.date}`} detail="Wynik obciążenia i poniższe pomiary pochodzą z różnych dni." />}
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

      {missingSignals.length > 0 && (
        <DataStateNotice title="Niepełne dane" detail={missingSignals.join(' | ')} />
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


