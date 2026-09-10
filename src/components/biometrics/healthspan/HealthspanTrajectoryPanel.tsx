import { Activity } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Pressable } from '../../ui/ControlPrimitives';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HealthspanHistoryPoint } from '../../../lib/healthspanHistoryApi';
import { shiftDateStr } from '../../../lib/date';

export default function HealthspanTrajectoryPanel({
  points,
}: {
  points: HealthspanHistoryPoint[];
}) {
  const [range, setRange] = useState<'12w' | '6m' | '1y'>('1y');
  const visiblePoints = useMemo(() => {
    const lastDate = points.at(-1)?.date;
    if (!lastDate) return [];
    const days = { '12w': 84, '6m': 183, '1y': 365 }[range];
    const cutoffDate = shiftDateStr(lastDate, -days);
    return points.filter((point) => point.date >= cutoffDate);
  }, [points, range]);
  const versions = [...new Set(visiblePoints.map((point) => point.modelVersion))];
  const chartData = visiblePoints.map((point) => ({
    ...point,
    [`score:${point.modelVersion}`]: point.score,
  }));
  if (!points.length) {
    return (
      <section className="rounded-2xl border border-border-custom/40 bg-surface-1 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <Activity size={15} /> Trajektoria Healthspan
        </h3>
        <p className="mt-2 text-sm text-text-secondary">
          Zbieramy historię. Pierwszy wiarygodny trend pojawi się po 12 tygodniach danych
          z tej samej wersji modelu.
        </p>
      </section>
    );
  }

  const hasModelChange = new Set(visiblePoints.map((point) => point.modelVersion)).size > 1;
  return (
    <section className="rounded-2xl border border-border-custom/40 bg-surface-1 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <Activity size={15} /> Trajektoria Healthspan
          </h3>
          <p className="mt-1 text-xs text-text-muted">Score i jakość pokrycia danych w czasie.</p>
        </div>
        {hasModelChange && (
          <span className="rounded-md bg-warning/10 px-2 py-1 text-2xs font-bold text-warning">
            Zmiana modelu — serie liczone osobno
          </span>
        )}
        <div className="flex rounded-lg bg-surface-solid/40 border border-border-custom/30 p-1">
          {([['12w', '12 tyg.'], ['6m', '6 mies.'], ['1y', 'Rok']] as const).map(([value, label]) => (
            <Pressable
              key={value}
              type="button"
              onClick={() => setRange(value)}
              className={`h-8 rounded-md px-2 text-2xs font-bold transition-all ${
                range === value ? 'bg-primary/15 text-primary font-black shadow-xs' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {label}
            </Pressable>
          ))}
        </div>
      </div>
      <div className="mt-4 h-52" aria-label="Wykres trajektorii Healthspan">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="var(--border-custom)" strokeOpacity={0.3} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} minTickGap={28} stroke="var(--border-custom)" />
            <YAxis domain={[0, 100]} width={28} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} stroke="var(--border-custom)" />
            <Tooltip
              contentStyle={{ background: 'var(--surface-solid)', border: '1px solid var(--border-custom)', borderRadius: 10 }}
              labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
            />
            {versions.map((version, index) => (
              <Line
                key={version}
                type="monotone"
                dataKey={`score:${version}`}
                name={`Healthspan score · ${version}`}
                stroke={index % 2 ? 'var(--color-primary)' : 'var(--color-info)'}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls={false}
              />
            ))}
            <Line type="monotone" dataKey="coverage" name="Pokrycie" stroke="var(--color-success)" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="confidence" name="Pewność" stroke="var(--color-warning)" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="ageLow" name="Dolna granica wieku" stroke="var(--text-muted)" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="ageHigh" name="Górna granica wieku" stroke="var(--text-muted)" strokeWidth={1} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
