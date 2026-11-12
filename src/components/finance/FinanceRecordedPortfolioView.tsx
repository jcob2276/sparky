import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPln } from '../../lib/finance/formatMoney';
import type { buildRecordedPortfolio } from '../../lib/finance/recordedPortfolio';

type History = ReturnType<typeof buildRecordedPortfolio>;
export function RecordedView({ history }: { history: History }) {
  const last = history.points.at(-1);
  return <div className="space-y-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-sm text-text-secondary">Zapisana wartość pozycji</p>
      <p className="text-xl font-semibold tabular-nums text-text-primary">{last ? formatPln(last.value, 2) : '—'}</p>
    </div>
    {history.points.length > 1 ? <div className="h-44" role="img" aria-label="Historia wartości zapisanych pozycji">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 176 }}>
        <AreaChart data={history.points}>
          <XAxis dataKey="date" hide /><YAxis hide domain={['auto', 'auto']} />
          <Tooltip formatter={value => formatPln(Number(value), 2)} contentStyle={{ background: 'var(--surface-solid)', borderColor: 'var(--separator)', color: 'var(--text-primary)' }} />
          <Area dataKey="value" name="Wartość pozycji" type="linear" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.08} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div> : <p className="py-4 text-sm text-text-muted">Historia zaczyna się od zapisania stanu początkowego. Wykres pojawi się po kolejnych wycenach.</p>}
    <dl className="divide-y divide-border-custom/20">
      <div className="flex justify-between gap-3 py-2 text-sm"><dt className="text-text-secondary">Zakupy w okresie porównania</dt><dd className="tabular-nums text-text-primary">{history.points.length > 1 ? formatPln(history.purchases, 2) : '—'}</dd></div>
      <div className="flex justify-between gap-3 py-2 text-sm"><dt className="text-text-secondary">Zmiana wartości po odjęciu zakupów</dt><dd className="tabular-nums text-text-primary">{history.valuationChange == null ? '—' : formatPln(history.valuationChange, 2)}</dd></div>
    </dl>
    <p className="text-xs leading-relaxed text-text-muted">{history.points[0] && last ? `${history.points[0].date} – ${last.date} · ${history.points.length} wycen. ` : ''}Źródło: zapisane ilości i ceny zamknięcia w PLN. Bez gotówki brokera, prowizji i dywidend. Korekty i usunięcia w okresie wstrzymują obliczanie zmiany po odjęciu zakupów.</p>
    {history.missing.length > 0 && <p className="text-xs text-warning">Niepełna historia cen: {history.missing.join(', ')}. Dni bez pełnej wyceny są pomijane.</p>}
  </div>;
}
