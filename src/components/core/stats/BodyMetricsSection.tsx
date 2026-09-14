import { useState } from 'react';
import { Activity, Scale, Ruler, Check } from 'lucide-react';
import Button from '../../ui/Button';
import { ControlInput } from '../../ui/ControlPrimitives';
import { computeBmi, effectiveWaistForNavy, navyBodyFatPct } from '../../../lib/health/bodyMetrics';
import { BMI_NORMAL_LOW, BMI_NORMAL_HIGH } from '../../../lib/constants';
import { BodyCircumferencesDrawer } from './BodyCircumferencesDrawer';
import { BodyMetricsKpis } from './BodyMetricsKpis';

interface TrendPoint {
  cur: number | null;
  prev: number | null;
}

export interface NewMetricState {
  weight: string;
  waist: string;
  neck: string;
  chest: string;
  belly: string;
  hips: string;
  thigh: string;
  biceps_l: string;
  calf: string;
}

interface BodyMetricsSectionProps {
  trends: {
    weight?: TrendPoint;
    waist?: TrendPoint;
  };
  newMetric: NewMetricState;
  setNewMetric: (metric: NewMetricState) => void;
  latestBody: {
    weight: number | null;
    waist: number | null;
    neck: number | null;
    body_fat: number | null;
    hips: number | null;
    belly: number | null;
    chest: number | null;
    thigh: number | null;
    biceps_l: number | null;
    calf: number | null;
  } | null;
  heightCm: number | null;
  saveMetrics: (e: React.FormEvent) => void;
}

function TrendPill({ cur, prev, unit, better = 'down' }: { cur?: number | null; prev?: number | null; unit: string; better?: 'up' | 'down' }) {
  if (cur == null || prev == null) return null;
  const diff = Math.round((cur - prev) * 10) / 10;
  if (Math.abs(diff) < 0.05) {
    return <span className="text-3xs font-mono font-bold text-text-muted px-1.5 py-0.5 rounded bg-surface-2/60">0.0 {unit}</span>;
  }
  const isBetter = better === 'down' ? diff < 0 : diff > 0;
  return (
    <span
      className={`text-3xs font-mono font-bold px-1.5 py-0.5 rounded border ${
        isBetter
          ? 'bg-success/10 text-success border-success/20'
          : 'bg-warning/10 text-warning border-warning/20'
      }`}
    >
      {diff > 0 ? `+${diff}` : `${diff}`} {unit}
    </span>
  );
}


export function BodyMetricsSection({
  trends, newMetric, setNewMetric, latestBody, heightCm, saveMetrics,
}: BodyMetricsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const set = (key: keyof NewMetricState) => (v: string) => setNewMetric({ ...newMetric, [key]: v });

  const w = parseFloat(newMetric.weight) || latestBody?.weight || null;
  const waist = parseFloat(newMetric.waist) || latestBody?.waist || null;
  const belly = parseFloat(newMetric.belly) || latestBody?.belly || null;
  const neck = parseFloat(newMetric.neck) || latestBody?.neck || null;
  const hips = parseFloat(newMetric.hips) || latestBody?.hips || null;

  const bmi = w && heightCm ? computeBmi(w, heightCm) : null;
  const whrWaist = waist ?? belly;
  const whr = whrWaist && hips ? Math.round((whrWaist / hips) * 100) / 100 : null;
  const waistNavy = effectiveWaistForNavy({
    waist: parseFloat(newMetric.waist) || latestBody?.waist,
    belly: parseFloat(newMetric.belly) || latestBody?.belly,
  });
  const bf = waistNavy && neck && heightCm ? navyBodyFatPct(waistNavy, neck, heightCm) : null;

  const bmiLabel = bmi == null ? null : bmi < BMI_NORMAL_LOW ? 'Niedowaga' : bmi < BMI_NORMAL_HIGH ? 'Norma' : bmi < 30 ? 'Nadwaga' : 'Otyłość';
  const bmiBadgeColor = bmi == null ? '' : bmi < BMI_NORMAL_LOW ? 'text-warning bg-warning/10 border-warning/20' : bmi < BMI_NORMAL_HIGH ? 'text-success bg-success/10 border-success/20' : 'text-danger bg-danger/10 border-danger/20';

  const bfLabel = bf == null ? null : bf < 10 ? 'Wyżyłowany' : bf < 16 ? 'Atletyczny' : bf < 22 ? 'Zdrowy' : 'Podwyższony';
  const bfBadgeColor = bf == null ? '' : bf < 10 ? 'text-warning bg-warning/10 border-warning/20' : bf < 16 ? 'text-success bg-success/10 border-success/20' : bf < 22 ? 'text-primary bg-primary/10 border-primary/20' : 'text-danger bg-danger/10 border-danger/20';

  return (
    <section id="kronika-pomiary" className="rounded-2xl border border-border-custom bg-surface/50 backdrop-blur-[var(--blur-md)] p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <p className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-18em)] text-text-muted font-display">
              Pomiary ciała & Skład
            </p>
          </div>
          <h2 className="mt-0.5 font-display text-lg font-black tracking-tight text-text-primary flex items-center gap-2">
            Waga & Talia
            <span className="text-xs font-normal text-text-muted">· Telemetria</span>
          </h2>
        </div>
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20">
          <Activity size={16} />
        </div>
      </div>

      {/* Hero Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Waga */}
        <div className="relative rounded-xl border border-border-custom bg-surface p-3.5 shadow-sm transition-all focus-within:border-primary/60 focus-within:shadow-focus">
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-muted font-display">
              <Scale size={13} className="text-primary" />
              Waga
            </label>
            <TrendPill cur={trends.weight?.cur} prev={trends.weight?.prev} unit="kg" better="down" />
          </div>
          <div className="flex items-baseline gap-2">
            <ControlInput
              type="text" inputMode="decimal" value={newMetric.weight}
              onChange={(e) => setNewMetric({ ...newMetric, weight: e.target.value.replace(',', '.') })}
              className="w-full bg-transparent text-2xl font-black text-text-primary outline-none placeholder:text-text-muted/40 font-display"
              placeholder={latestBody?.weight ? String(latestBody.weight) : '--'}
            />
            <span className="text-xs font-bold text-text-muted uppercase">kg</span>
          </div>
        </div>

        {/* Talia */}
        <div className="relative rounded-xl border border-border-custom bg-surface p-3.5 shadow-sm transition-all focus-within:border-primary/60 focus-within:shadow-focus">
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-muted font-display">
              <Ruler size={13} className="text-warning" />
              Talia
            </label>
            <TrendPill cur={trends.waist?.cur} prev={trends.waist?.prev} unit="cm" better="down" />
          </div>
          <div className="flex items-baseline gap-2">
            <ControlInput
              type="text" inputMode="decimal" value={newMetric.waist}
              onChange={(e) => setNewMetric({ ...newMetric, waist: e.target.value.replace(',', '.') })}
              className="w-full bg-transparent text-2xl font-black text-text-primary outline-none placeholder:text-text-muted/40 font-display"
              placeholder={latestBody?.waist ? String(latestBody.waist) : '--'}
            />
            <span className="text-xs font-bold text-text-muted uppercase">cm</span>
          </div>
        </div>
      </div>

      {/* Live Calculated KPI Badges */}
      <BodyMetricsKpis
        bmi={bmi}
        bmiLabel={bmiLabel}
        bmiBadgeColor={bmiBadgeColor}
        bf={bf}
        bfLabel={bfLabel}
        bfBadgeColor={bfBadgeColor}
        latestBodyFat={latestBody?.body_fat}
        whr={whr}
      />

      {/* Expandable detailed circumferences */}
      <BodyCircumferencesDrawer
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        newMetric={newMetric}
        set={set}
        latestBody={latestBody}
      />

      {/* Save Button */}
      <Button
        variant="primary"
        onClick={saveMetrics}
        className="w-full flex items-center justify-center gap-2 py-3"
      >
        <Check size={14} />
        Zapisz pomiary
      </Button>
    </section>
  );
}
