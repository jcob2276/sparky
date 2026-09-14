import { Scale, TrendingDown, TrendingUp, Minus, Plus, Ruler } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Pressable } from '../../ui/ControlPrimitives';

interface BodyMetricRow {
  date: string | null;
  weight: number | null;
  waist: number | null;
  neck: number | null;
  hips: number | null;
  body_fat: number | null;
}

interface Props {
  body: BodyMetricRow[];
  heightCm?: number | null;
  onOpenWeight?: () => void;
}

export default function DesktopBodyCompPanel({ body, heightCm, onOpenWeight }: Props) {
  const validMetrics = body.filter((b) => b.weight != null);
  const latest = validMetrics[validMetrics.length - 1] ?? null;
  const prev7d = validMetrics.length > 1 ? validMetrics[Math.max(0, validMetrics.length - 8)] : null;

  const curWeight = latest?.weight ?? null;
  const prevWeight = prev7d?.weight ?? null;
  const delta = curWeight != null && prevWeight != null ? Math.round((curWeight - prevWeight) * 10) / 10 : null;

  // Estimate BMI if height is available
  const bmi = curWeight && heightCm ? (curWeight / Math.pow(heightCm / 100, 2)).toFixed(1) : null;

  const targetWeight = 75.5; // Canonical Sprint target weight
  const toTarget = curWeight != null ? Math.round((curWeight - targetWeight) * 10) / 10 : null;

  return (
    <Card variant="surface" padding="1.25rem" className="space-y-4 border-border-custom bg-surface/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-info/20 bg-info/10 p-2 text-info">
            <Scale size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Kompozycja Ciała & Waga</h3>
            <p className="text-xs text-text-muted">
              Masa ciała, obwody antropometryczne i estymacja tkanki tłuszczowej
            </p>
          </div>
        </div>
        <Pressable
          onClick={onOpenWeight}
          className="flex items-center gap-1.5 rounded-xl border border-info/30 bg-info/10 px-3 py-1.5 text-xs font-semibold text-info hover:bg-info/20 transition-colors"
        >
          <Plus size={14} />
          <span>Wpis wagi</span>
        </Pressable>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Waga bieżąca */}
        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Aktualna waga</p>
          <p className="mt-1 text-2xl font-light text-text-primary">
            {curWeight != null ? `${curWeight.toFixed(1)} kg` : '—'}
          </p>
          <div className="mt-0.5 flex items-center justify-center gap-1 text-2xs">
            {delta == null ? (
              <span className="text-text-muted">brak bazy 7d</span>
            ) : delta === 0 ? (
              <span className="flex items-center text-text-muted"><Minus size={10} /> bez zmian</span>
            ) : delta > 0 ? (
              <span className="flex items-center font-semibold text-warning"><TrendingUp size={11} className="mr-0.5" /> +{delta} kg / 7d</span>
            ) : (
              <span className="flex items-center font-semibold text-success"><TrendingDown size={11} className="mr-0.5" /> {delta} kg / 7d</span>
            )}
          </div>
        </div>

        {/* Cel sprintu */}
        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Cel sprintu</p>
          <p className="mt-1 text-2xl font-light text-text-primary">{targetWeight} kg</p>
          <p className="mt-0.5 text-2xs text-text-muted">
            {toTarget == null ? '—' : toTarget > 0 ? `${toTarget} kg do celu` : 'cel osiągnięty'}
          </p>
        </div>

        {/* Tkanka tłuszczowa / BMI */}
        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">
            {latest?.body_fat != null ? 'Tkanka tłuszczowa' : 'Wskaźnik BMI'}
          </p>
          <p className="mt-1 text-2xl font-light text-text-primary">
            {latest?.body_fat != null ? `${latest.body_fat.toFixed(1)}%` : bmi ? `${bmi}` : '—'}
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">
            {latest?.body_fat != null ? 'pomiar bioimpedancji' : heightCm ? `wzrost ${heightCm} cm` : 'antropometria'}
          </p>
        </div>

        {/* Obwód pasa */}
        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="flex items-center justify-center gap-1 text-2xs font-bold uppercase tracking-wider text-text-muted">
            <Ruler size={11} /> Obwód talii
          </p>
          <p className="mt-1 text-2xl font-light text-text-primary">
            {latest?.waist != null ? `${latest.waist} cm` : '—'}
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">
            {latest?.hips != null ? `biodra ${latest.hips} cm` : 'obwód na wysokości pępka'}
          </p>
        </div>
      </div>

      {/* Ostatnie 5 pomiarów — mini Sparkline */}
      {validMetrics.length > 2 && (
        <div className="rounded-xl border border-border-custom/50 bg-surface-2/30 p-3">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted mb-2">Trend ostatnich pomiarów</p>
          <div className="flex items-end justify-between gap-2 h-10 px-2">
            {validMetrics.slice(-8).map((m, idx) => {
              const minW = Math.min(...validMetrics.slice(-8).map((v) => v.weight!));
              const maxW = Math.max(...validMetrics.slice(-8).map((v) => v.weight!));
              const spread = Math.max(1, maxW - minW);
              const heightPct = Math.round((((m.weight! - minW) / spread) * 0.7 + 0.3) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className="w-full max-w-5 rounded-t-sm bg-info/40 group-hover:bg-info transition-colors"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-3xs text-text-muted font-mono">{m.weight}</span>
                  {m.date && (
                    <span className="text-3xs text-text-muted/50 font-mono scale-90">{m.date.slice(5)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Running Power-to-Weight telemetry */}
      {curWeight != null && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-info/5 border border-info/20 text-2xs text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="font-bold text-info">Ekonomia biegu:</span>
            <span>
              {toTarget != null && toTarget > 0
                ? `Redukcja ${toTarget} kg do celu (75.5 kg) = zysk ok. ${(toTarget * 2.5).toFixed(0)}s/km (~${Math.round((toTarget * 2.5 * 42.195) / 60)} min na dystansie maratonu)`
                : 'Masa startowa w strefie optymalnej ekonomii biegu'}
            </span>
          </div>
          <span className="text-3xs text-text-muted font-mono shrink-0">~2.5s/km per kg</span>
        </div>
      )}
    </Card>
  );
}
