import type { MatrixCorrelationStats } from './multiDomainMatrixTypes';

interface Props {
  stats: MatrixCorrelationStats;
}

export function MultiDomainMatrixInsights({ stats }: Props) {
  const {
    pastDaysCount,
    cleanDaysCount,
    daysWithIncident,
    avgSleepIncidentDays,
    avgSleepCleanDays,
    powerListRateIncidentDays,
    powerListRateCleanDays,
    daysWithTraining,
    daysWithHighProtein,
    daysWithHighCarbs,
    perfectDaysCount,
  } = stats;

  if (pastDaysCount === 0) return null;

  const cleanPercent = Math.round((cleanDaysCount / pastDaysCount) * 100);

  return (
    <div className="mt-4 pt-3.5 border-t border-border-custom space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-2xs font-bold uppercase tracking-wider text-text-muted">
          SYNTEZA KORELACJI — OKNO 13 TYGODNI ({pastDaysCount} DNI)
        </span>
        <span className="text-2xs text-text-muted">
          Synchronizacja dyscypliny, makro i regeneracji
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Metric 1: Clean Rate */}
        <div className="rounded-xl border border-border-custom bg-surface/40 p-2.5 space-y-1">
          <div className="flex items-center justify-between text-2xs text-text-muted">
            <span>Dni Czyste (No Lenie)</span>
            <span className="font-bold text-success">{cleanPercent}%</span>
          </div>
          <div className="text-sm font-black text-text-primary">
            {cleanDaysCount} <span className="text-xs font-normal text-text-muted">/ {pastDaysCount}</span>
          </div>
          <p className="text-3xs text-text-muted">
            {daysWithIncident > 0
              ? `${daysWithIncident} dni z odnotowanym załamaniem`
              : 'Zero załamań w oknie 13 tyg!'}
          </p>
        </div>

        {/* Metric 2: Sleep & Recovery contrast */}
        <div className="rounded-xl border border-border-custom bg-surface/40 p-2.5 space-y-1">
          <div className="flex items-center justify-between text-2xs text-text-muted">
            <span>Sen: Czysto vs Incydent</span>
            <span className="font-bold text-info">Oura</span>
          </div>
          <div className="text-sm font-black text-text-primary">
            {avgSleepCleanDays ?? '—'}{' '}
            <span className="text-xs font-normal text-text-muted">
              vs {avgSleepIncidentDays ?? '—'}
            </span>
          </div>
          <p className="text-3xs text-text-muted">
            {avgSleepCleanDays && avgSleepIncidentDays
              ? avgSleepCleanDays > avgSleepIncidentDays
                ? `+${avgSleepCleanDays - avgSleepIncidentDays} pkt snu w dniach bez incydentu`
                : 'Zbliżona jakość snu'
              : 'Brak danych porównawczych'}
          </p>
        </div>

        {/* Metric 3: Power List contrast */}
        <div className="rounded-xl border border-border-custom bg-surface/40 p-2.5 space-y-1">
          <div className="flex items-center justify-between text-2xs text-text-muted">
            <span>Power List: Realizacja</span>
            <span className="font-bold text-primary">⚡</span>
          </div>
          <div className="text-sm font-black text-text-primary">
            {powerListRateCleanDays != null ? `${powerListRateCleanDays}%` : '—'}{' '}
            <span className="text-xs font-normal text-text-muted">
              vs {powerListRateIncidentDays != null ? `${powerListRateIncidentDays}%` : '—'}
            </span>
          </div>
          <p className="text-3xs text-text-muted">
            {powerListRateCleanDays != null && powerListRateIncidentDays != null
              ? powerListRateCleanDays > powerListRateIncidentDays
                ? `+${powerListRateCleanDays - powerListRateIncidentDays}% wyższa skuteczność w dni czyste`
                : 'Brak odchylenia'
              : 'Śledzenie Power List aktywne'}
          </p>
        </div>

        {/* Metric 4: Full Stack Titan Days */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 space-y-1">
          <div className="flex items-center justify-between text-2xs text-primary font-bold">
            <span>Dni Pełnej Formy</span>
            <span>🏆</span>
          </div>
          <div className="text-sm font-black text-primary">
            {perfectDaysCount}{' '}
            <span className="text-xs font-normal text-text-muted">dni</span>
          </div>
          <p className="text-3xs text-text-muted">
            Trening + Białko + Sen ≥78 + Czysto
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-3xs text-text-muted pt-1">
        <span>🏋️ Treningi (siłownia/bieg): <b className="text-text-primary">{daysWithTraining}</b></span>
        <span>🥩 Dni z białkiem ≥140g: <b className="text-text-primary">{daysWithHighProtein}</b></span>
        <span>🍚 Dni z węglami ≥200g: <b className="text-text-primary">{daysWithHighCarbs}</b></span>
      </div>
    </div>
  );
}
