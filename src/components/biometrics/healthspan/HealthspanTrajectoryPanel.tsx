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

export default function HealthspanTrajectoryPanel({
  points,
}: {
  points: HealthspanHistoryPoint[];
}) {
  const [range, setRange] = useState<'12w' | '6m' | '1y'>('1y');
  const visiblePoints = useMemo(() => {
    const lastDate = points.at(-1)?.date;
    if (!lastDate) return [];
    const cutoff = new Date(`${lastDate}T12:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - ({ '12w': 84, '6m': 183, '1y': 365 }[range]));
    const cutoffDate = cutoff.toISOString().slice(0, 10);
    return points.filter((point) => point.date >= cutoffDate);
  }, [points, range]);
  const versions = [...new Set(visiblePoints.map((point) => point.modelVersion))];
  const chartData = visiblePoints.map((point) => ({
    ...point,
    [`score:${point.modelVersion}`]: point.score,
  }));
  if (!points.length) {
    return (
      <section className="rounded-2xl border border-white/10 bg-surface-1 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
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
    <section className="rounded-2xl border border-white/10 bg-surface-1 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Activity size={15} /> Trajektoria Healthspan
          </h3>
          <p className="mt-1 text-xs text-text-muted">Score i jakość pokrycia danych w czasie.</p>
        </div>
        {hasModelChange && (
          <span className="rounded-md bg-warning/10 px-2 py-1 text-2xs font-bold text-warning">
            Zmiana modelu — serie liczone osobno
          </span>
        )}
        <div className="flex rounded-lg bg-white/5 p-1">
          {([['12w', '12 tyg.'], ['6m', '6 mies.'], ['1y', 'Rok']] as const).map(([value, label]) => (
            <Pressable
              key={value}
              type="button"
              onClick={() => setRange(value)}
              className={`h-8 rounded-md px-2 text-2xs font-bold ${
                range === value ? 'bg-white/10 text-white' : 'text-text-muted'
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
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#777' }} minTickGap={28} />
            <YAxis domain={[0, 100]} width={28} tick={{ fontSize: 10, fill: '#777' }} />
            <Tooltip
              contentStyle={{ background: '#171717', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10 }}
              labelStyle={{ color: '#fff' }}
            />
            {versions.map((version, index) => (
              <Line
                key={version}
                type="monotone"
                dataKey={`score:${version}`}
                name={`Healthspan score · ${version}`}
                stroke={index % 2 ? '#8B5CF6' : '#0077E6'}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls={false}
              />
            ))}
            <Line type="monotone" dataKey="coverage" name="Pokrycie" stroke="#15B042" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="confidence" name="Pewność" stroke="#CAFACE" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="ageLow" name="Dolna granica wieku" stroke="#777777" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="ageHigh" name="Górna granica wieku" stroke="#777777" strokeWidth={1} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
