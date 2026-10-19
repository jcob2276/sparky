import { Scale, TrendingDown, TrendingUp, Plus } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Pressable } from '../../ui/ControlPrimitives';
import { getTodayWarsaw } from '../../../lib/date';

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

const TARGET_WEIGHT_KG = 75.5;
const STALE_AFTER_DAYS = 14;

function daysSince(date: string | null): number | null {
  if (!date) return null;
  return Math.round((Date.parse(`${getTodayWarsaw()}T12:00:00Z`) - Date.parse(`${date.slice(0, 10)}T12:00:00Z`)) / 86_400_000);
}

export default function DesktopBodyCompPanel({ body, onOpenWeight }: Props) {
  const weights = body.filter((b) => b.weight != null);
  const latest = weights[weights.length - 1] ?? null;
  const prev = weights.length > 1 ? weights[Math.max(0, weights.length - 8)] : null;
  const weight = latest?.weight ?? null;
  const delta = weight != null && prev?.weight != null ? Math.round((weight - prev.weight) * 10) / 10 : null;
  const toTarget = weight != null ? Math.round((weight - TARGET_WEIGHT_KG) * 10) / 10 : null;
  const age = daysSince(latest?.date ?? null);
  const stale = age != null && age > STALE_AFTER_DAYS;
  const waist = [...body].reverse().find((b) => b.waist != null) ?? null;

  return (
    <Card variant="surface" padding="1.25rem" className="space-y-4 border-border-custom bg-surface/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-info/20 bg-info/10 p-2 text-info"><Scale size={20} /></div>
          <h3 className="text-sm font-bold tracking-tight text-text-primary">Waga i talia</h3>
        </div>
        <Pressable
          onClick={onOpenWeight}
          className="flex items-center gap-1.5 rounded-xl border border-info/30 bg-info/10 px-3 py-1.5 text-xs font-semibold text-info hover:bg-info/20 transition-colors"
        >
          <Plus size={14} />
          <span>Wpis wagi</span>
        </Pressable>
      </div>

      {stale && (
        <p className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
          Ostatni pomiar sprzed {age} dni. Zważ się, żeby liczby były aktualne.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Waga</p>
          <p className="mt-1 text-2xl font-light text-text-primary">{weight != null ? weight.toFixed(1) : '—'}</p>
          {!stale && delta != null && delta !== 0 && (
            <p className={`mt-0.5 flex items-center justify-center gap-0.5 text-2xs font-semibold ${delta > 0 ? 'text-warning' : 'text-success'}`}>
              {delta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {delta > 0 ? '+' : ''}{delta} kg / 7 dni
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Cel {TARGET_WEIGHT_KG}</p>
          <p className="mt-1 text-2xl font-light text-text-primary">
            {toTarget == null ? '—' : toTarget > 0 ? `−${toTarget}` : '✓'}
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">{toTarget != null && toTarget > 0 ? 'kg do celu' : ''}</p>
        </div>
        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Talia</p>
          <p className="mt-1 text-2xl font-light text-text-primary">{waist?.waist ?? '—'}</p>
          <p className="mt-0.5 text-2xs text-text-muted">{waist?.waist != null ? 'cm' : ''}</p>
        </div>
      </div>
    </Card>
  );
}
