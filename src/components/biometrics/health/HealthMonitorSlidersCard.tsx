import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  evaluateHealthMonitor,
  type HealthMonitorResult,
  type VitalBaseline,
  type VitalHistoryRecord,
} from '@vanguard/domain';
import type { OuraHealthHubData } from '../oura/types';

interface HealthMonitorSlidersCardProps {
  data: OuraHealthHubData;
}

export function HealthMonitorSlidersCard({ data }: HealthMonitorSlidersCardProps) {
  const result: HealthMonitorResult = useMemo(() => {
    const current = {
      hrv: data.enhanced?.sleep_average_hrv ?? data.oura?.hrv_avg ?? null,
      restingHr: data.enhanced?.sleep_lowest_heart_rate ?? data.oura?.rhr_avg ?? null,
      breathingRate: data.enhanced?.sleep_average_breath ?? null,
      skinTempDev: data.enhanced?.temperature_deviation ?? null,
      spo2: data.enhanced?.spo2_percentage ?? null,
    };

    const summaries = new Map((data.ouraHistory ?? []).map((row) => [row.date, row]));
    const enhanced = new Map((data.enhancedHistory ?? []).map((row) => [row.date, row]));
    const history: VitalHistoryRecord[] = [...new Set([...summaries.keys(), ...enhanced.keys()])].map((date) => ({
      date,
      hrv: enhanced.get(date)?.sleep_average_hrv ?? summaries.get(date)?.hrv_avg ?? null,
      restingHr: enhanced.get(date)?.sleep_lowest_heart_rate ?? summaries.get(date)?.rhr_avg ?? null,
      breathingRate: enhanced.get(date)?.sleep_average_breath ?? null,
      skinTempDev: enhanced.get(date)?.temperature_deviation ?? null,
      spo2: enhanced.get(date)?.spo2_percentage ?? null,
    }));

    return evaluateHealthMonitor(current, history, data.date ?? undefined);
  }, [data]);

  return (
    <section className="rounded-2xl border border-border-custom/40 bg-surface-1 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-custom/40 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-primary shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Monitor parametrów życiowych (Health Monitor)
            </h3>
            <p className="text-2xs text-text-muted">
              Porównanie z wcześniejszymi nocami w oknie 30 dni · {data.date ?? 'brak daty'}
            </p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-2xs font-semibold ${
          result.overallStatus === 'all_normal'
            ? 'bg-success/15 text-success border-success/30'
            : result.overallStatus === 'attention_needed'
            ? 'bg-warning/15 text-warning border-warning/30'
            : 'bg-surface-2 text-text-muted border-border-custom/60'
        }`}>
          {result.overallStatus === 'all_normal' && <CheckCircle2 size={12} />}
          {result.overallStatus === 'attention_needed' && <AlertTriangle size={12} />}
          {result.overallStatusLabel}
        </span>
      </div>

      <div className="space-y-3.5">
        {result.vitals.map((vital) => (
          <VitalSliderRow key={vital.metricKey} vital={vital} />
        ))}
      </div>

      <p className="text-3xs text-text-muted pt-1 border-t border-border-custom/40">
        Przedział obejmuje percentyle 10–90 z co najmniej 14 wcześniejszych nocy. To opis historii, nie norma kliniczna. Odchylenie temperatury skóry nie potwierdza gorączki; monitor nie stawia diagnoz.
      </p>
    </section>
  );
}

function VitalSliderRow({ vital }: { vital: VitalBaseline }) {
  // Determine dot position and baseline bounds on a 0-100% scale
  const { positionPct, baselineLeftPct, baselineWidthPct } = useMemo(() => {
    if (vital.baselineMin == null || vital.baselineMax == null || vital.currentValue == null) {
      return { positionPct: 50, baselineLeftPct: 35, baselineWidthPct: 30 };
    }

    const min = vital.baselineMin;
    const max = vital.baselineMax;
    const span = Math.max(1, max - min);
    // Visual window stretches by 60% on each side of the baseline
    const visualStart = min - span * 0.7;
    const visualEnd = max + span * 0.7;
    const visualSpan = Math.max(1, visualEnd - visualStart);

    const bLeft = Math.max(5, Math.min(80, ((min - visualStart) / visualSpan) * 100));
    const bRight = Math.max(15, Math.min(95, ((max - visualStart) / visualSpan) * 100));
    const bWidth = Math.max(8, bRight - bLeft);

    const pos = Math.max(3, Math.min(97, ((vital.currentValue - visualStart) / visualSpan) * 100));

    return {
      positionPct: pos,
      baselineLeftPct: bLeft,
      baselineWidthPct: bWidth,
    };
  }, [vital]);

  const statusColor = {
    optimal: 'text-success bg-success/15 border-success/30',
    attention: 'text-warning bg-warning/15 border-warning/30',
    alert: 'text-danger bg-danger/15 border-danger/30',
    calibrating: 'text-text-muted bg-surface-2 border-border-custom/60',
  }[vital.status];

  return (
    <div className="space-y-1.5 rounded-xl border border-border-custom/40 bg-surface-2/70 p-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-primary">{vital.name}</span>
          <span className="text-2xs text-text-muted font-mono">{vital.formattedCurrent}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-3xs text-text-muted hidden sm:inline">
            Historia: {vital.formattedBaseline}
          </span>
          <span className={`rounded-full border px-2 py-0.5 text-3xs font-semibold ${statusColor}`}>
            {vital.statusLabel}
          </span>
        </div>
      </div>

      {/* Baseline Range Slider Track */}
      <div className="relative h-3 w-full rounded-full bg-surface-1 border border-border-custom/40 overflow-hidden">
        {/* Normal Baseline Zone Capsule */}
        {vital.baselineMin != null && vital.baselineMax != null && <div
          className="absolute top-0.5 bottom-0.5 rounded-full bg-success/20 border border-success/30"
          style={{
            left: `${baselineLeftPct}%`,
            width: `${baselineWidthPct}%`,
          }}
          title={`Przedział Twojej historii: ${vital.formattedBaseline}`}
        />}

        {/* Current Value Marker Dot */}
        {vital.currentValue != null && vital.baselineMin != null && vital.baselineMax != null && (
          <div
            className={`absolute top-0 bottom-0 w-3 -ml-1.5 rounded-full shadow-xs border border-border-custom/70 transition-all ${
              vital.status === 'optimal'
                ? 'bg-success'
                : vital.status === 'attention'
                ? 'bg-warning'
                : 'bg-danger'
            }`}
            style={{ left: `${positionPct}%` }}
            title={`Bieżący odczyt: ${vital.formattedCurrent}`}
          />
        )}
      </div>

      <div className="flex items-center justify-between text-3xs text-text-muted font-mono px-0.5 sm:hidden">
        <span>Baza: {vital.formattedBaseline}</span>
        <span>{vital.daysOfHistory} nocy</span>
      </div>
    </div>
  );
}
