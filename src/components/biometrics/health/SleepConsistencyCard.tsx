/**
 * @file SleepConsistencyCard.tsx
 * @role Karta analizy regularności snu (Sleep Consistency) oraz dżetlagu społecznego (Social Jetlag)
 * w stylu Bevel Health. Monitoruje spójność pór zasypiania i budzenia w ujęciu 7-dniowym oraz
 * przesunięcie środka fazy snu (MidSleep) między dniami roboczymi a weekendem.
 */

import { Clock, Calendar, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { type SleepConsistencyResult } from '@vanguard/domain';

interface SleepConsistencyCardProps {
  data: SleepConsistencyResult;
}

export function SleepConsistencyCard({ data }: SleepConsistencyCardProps) {
  const getScoreColorClass = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-primary';
    if (score >= 50) return 'text-warning';
    return 'text-danger';
  };

  const getRatingBadge = () => {
    switch (data.rating) {
      case 'optimal':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-success">
            <CheckCircle2 size={10} /> Optymalna
          </span>
        );
      case 'good':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-primary">
            Dobra
          </span>
        );
      case 'fair':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-warning">
            Przeciętna
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-danger">
            <AlertTriangle size={10} /> Zaburzona
          </span>
        );
    }
  };

  return (
    <Card className="space-y-4 p-4 text-text-primary">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-custom bg-surface-2">
            <Clock size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Regularność Snu</h3>
            <p className="text-3xs text-text-muted">Synchronizacja zegara biologicznego (7 dni)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className={`text-xl font-bold tracking-tight ${getScoreColorClass(data.consistencyScore)}`}>
              {data.consistencyScore}%
            </span>
          </div>
          {getRatingBadge()}
        </div>
      </div>

      {/* 3 metryki: Zasypianie, Budzenie, Social Jetlag */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-3">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Pora snu
          </span>
          <div className="mt-1">
            <span className="text-lg font-bold tracking-tight">{data.averageBedtime}</span>
            <span className="ml-1 text-3xs text-text-muted">±{data.bedtimeStdDevMinutes}m</span>
          </div>
          <span className="mt-0.5 block text-3xs text-text-secondary">Zmienność zasypiania</span>
        </div>

        <div className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-3">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Pobudka
          </span>
          <div className="mt-1">
            <span className="text-lg font-bold tracking-tight">{data.averageWakeTime}</span>
            <span className="ml-1 text-3xs text-text-muted">±{data.wakeStdDevMinutes}m</span>
          </div>
          <span className="mt-0.5 block text-3xs text-text-secondary">Zmienność wstawania</span>
        </div>

        <div className="rounded-xl border border-border-custom/50 bg-surface-2/40 p-3">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Social Jetlag
          </span>
          <div className="mt-1">
            <span
              className={`text-lg font-bold tracking-tight ${
                data.hasMeaningfulSocialJetlag ? 'text-warning' : 'text-text-primary'
              }`}
            >
              {data.socialJetlagHours}h
            </span>
            <span className="ml-1 text-3xs text-text-muted">({data.socialJetlagMinutes}m)</span>
          </div>
          <span className="mt-0.5 block text-3xs text-text-secondary">Przesunięcie weekend</span>
        </div>
      </div>

      {/* Porównanie MidSleep: dni robocze vs wolne */}
      {data.workdayMidSleep && data.freeDayMidSleep && (
        <div className="rounded-xl border border-border-custom/30 bg-surface-2/20 p-2.5">
          <div className="flex items-center justify-between text-2xs text-text-secondary">
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-text-muted" />
              <span>Środek snu (MidSleep):</span>
            </div>
            <div className="flex items-center gap-3 text-3xs font-semibold">
              <span className="text-text-muted">
                Tydzień: <strong className="text-text-primary">{data.workdayMidSleep}</strong>
              </span>
              <span className="text-text-muted">
                Weekend: <strong className="text-primary">{data.freeDayMidSleep}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Rekomendacja */}
      <div className="flex items-start gap-2 rounded-xl border border-border-custom/40 bg-surface-2/20 p-2.5 text-xs text-text-secondary">
        {data.hasMeaningfulSocialJetlag ? (
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
        ) : (
          <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
        )}
        <p className="text-2xs leading-relaxed">{data.recommendation}</p>
      </div>
    </Card>
  );
}
