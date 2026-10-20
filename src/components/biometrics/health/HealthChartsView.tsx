import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ANALYTICS_DATASETS, type HealthChartPoint } from '@vanguard/domain';
import { ControlSelect } from '../../ui/ControlPrimitives';
import Button from '../../ui/Button';
import { HEALTH_CHART_TABLES, type ChartSelection } from './useHealthCharts';

interface Props {
  selection: ChartSelection;
  from: string;
  to: string;
  points: HealthChartPoint[];
  truncated: boolean;
  loading: boolean;
  error: string | null;
  onTable: (value: string) => void;
  onMetric: (value: string) => void;
  onDays: (value: number) => void;
  onAggregation: (value: 'mean' | 'sum') => void;
  onRetry: () => void;
}

function Status({ props, observed, label }: { props: Props; observed: number; label: string }) {
  if (props.loading) return <p className="text-sm text-text-muted">Wczytuję pomiary…</p>;
  if (props.error) {
    return (
      <div role="alert" className="space-y-2">
        <p className="text-sm text-danger">{props.error}</p>
        <Button onClick={props.onRetry}>Ponów odczyt</Button>
      </div>
    );
  }
  if (observed === 0) {
    return <p className="text-sm text-text-muted">Brak pomiarów „{label}” w wybranym okresie. Wybierz inną metrykę lub dłuższy okres.</p>;
  }
  return (
    <div className="h-52" role="img" aria-label={`Wykres: ${label}`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart data={props.points}>
          <CartesianGrid stroke="var(--border-custom)" vertical={false} />
          <XAxis dataKey="date" minTickGap={30} />
          <YAxis width={45} />
          <Tooltip />
          <Line type="linear" dataKey="value" name={label} stroke="var(--color-primary)" connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HealthChartsView(props: Props) {
  const { selection, points } = props;
  const source = ANALYTICS_DATASETS[selection.table];
  const label = source.metrics[selection.metric];
  const observed = points.filter((row) => row.value != null).length;
  const sources = HEALTH_CHART_TABLES.filter((key) => Object.keys(ANALYTICS_DATASETS[key].metrics).length > 0);
  return (
    <section className="space-y-4" aria-label="Własne wykresy zdrowia">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-text-secondary">Źródło
          <ControlSelect className="mt-1 w-full" value={selection.table} onChange={(event) => props.onTable(event.target.value)}>
            {sources.map((key) => <option key={key} value={key}>{ANALYTICS_DATASETS[key].label}</option>)}
          </ControlSelect>
        </label>
        <label className="text-xs text-text-secondary">Metryka
          <ControlSelect className="mt-1 w-full" value={selection.metric} onChange={(event) => props.onMetric(event.target.value)}>
            {Object.entries(source.metrics).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
          </ControlSelect>
        </label>
        <label className="text-xs text-text-secondary">Okres
          <ControlSelect className="mt-1 w-full" value={selection.days} onChange={(event) => props.onDays(Number(event.target.value))}>
            {[7, 28, 90, 180].map((days) => <option key={days} value={days}>{days} dni</option>)}
          </ControlSelect>
        </label>
        <label className="text-xs text-text-secondary">Dane w obrębie dnia
          <ControlSelect className="mt-1 w-full" value={selection.aggregation} onChange={(event) => props.onAggregation(event.target.value as 'mean' | 'sum')}>
            <option value="mean">Średnia z zapisów</option>
            <option value="sum">Suma zapisów</option>
          </ControlSelect>
        </label>
      </div>
      {!props.loading && !props.error && (
        <p className="text-xs text-text-muted">
          {props.from} – {props.to} · Europe/Warsaw · dni z pomiarem: {observed}/{points.length || selection.days}. Braki pozostają przerwami.
        </p>
      )}
      <Status props={props} observed={observed} label={label} />
      {props.truncated && (
        <p role="status" className="text-xs text-warning">
          Źródło przekroczyło limit 200 rekordów. Wykres jest niepełny — skróć okres przed wyciąganiem wniosków.
        </p>
      )}
      <p className="text-xs text-text-muted">
        Wykres opisuje zapisane dane. Wspólna zmiana dwóch metryk nie dowodzi przyczyny.
      </p>
    </section>
  );
}
