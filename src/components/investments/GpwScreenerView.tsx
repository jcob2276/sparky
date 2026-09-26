import { FC, useEffect, useMemo, useState } from 'react';
import { fetchEspiReports, fetchGpwFundamentals, fetchGpwPeriods, EspiReport, GpwFundamental, GpwPeriod } from '../../lib/investments/publicMarket';
import { fetchGpwYearly, GpwYear } from '../../lib/investments/gpwStatements';
import { GpwCompanyDetail } from './GpwCompanyDetail';
import Input from '../ui/Input';
import Select from '../ui/Select';

function cell(value: number | null, digits = 1): string {
  if (value == null) return '—';
  return value.toFixed(digits).replace('.', ',');
}

export const GpwScreenerView: FC = () => {
  const [rows, setRows] = useState<GpwFundamental[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxPe, setMaxPe] = useState('');
  const [sector, setSector] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [periods, setPeriods] = useState<GpwPeriod[]>([]);
  const [years, setYears] = useState<GpwYear[]>([]);
  const [loadedTicker, setLoadedTicker] = useState<string | null>(null);
  const [forecasts, setForecasts] = useState<EspiReport[]>([]);

  useEffect(() => {
    let active = true;
    fetchGpwFundamentals()
      .then((next) => {
        if (active) setRows(next);
      })
      .catch(() => {
        if (active) setRows([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchEspiReports('prognoz')
      .then((next) => {
        if (active) setForecasts(next.slice(0, 12));
      })
      .catch(() => {
        if (active) setForecasts([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    Promise.all([fetchGpwPeriods(selected), fetchGpwYearly(selected)])
      .then(([nextPeriods, nextYears]) => {
        if (!active) return;
        setPeriods(nextPeriods);
        setYears(nextYears);
        setLoadedTicker(selected);
      })
      .catch(() => {
        if (!active) return;
        setPeriods([]);
        setYears([]);
      });
    return () => {
      active = false;
    };
  }, [selected]);

  const sectors = useMemo(
    () => [...new Set(rows.map((row) => row.sector).filter(Boolean))].sort(),
    [rows],
  );
  const cap = Number(maxPe.replace(',', '.'));
  const shown = rows
    .filter((row) => !sector || row.sector === sector)
    .filter((row) => !Number.isFinite(cap) || cap <= 0 || (row.pe != null && row.pe <= cap))
    .slice()
    .sort((a, b) => (a.pe ?? 9999) - (b.pe ?? 9999));

  return (
    <div className="space-y-4 animate-fade-in text-text-primary">
      <div className="border border-border-custom bg-surface px-4 py-3">
        <div className="text-3xs font-mono uppercase tracking-wider text-text-muted">GPW · publiczny teaser</div>
        <h2 className="text-lg font-bold tracking-tight">Fundamenty {loading ? '…' : rows.length} spółek</h2>
        <p className="text-xs text-text-secondary mt-1 max-w-3xl">
          C/Z z publicznego zestawienia. Po kliknięciu spółki widać roczny rachunek wyników, od pierwszego opublikowanego roku.
          Prognozy poniżej to komunikaty ESPI, w których spółka sama pisze o prognozie.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Input
            type="text"
            size="sm"
            value={maxPe}
            onChange={(event) => setMaxPe(event.target.value)}
            placeholder="C/Z do"
          />
          <div className="w-56">
            <Select
              controlSize="sm"
              value={sector}
              onChange={(event) => setSector(event.target.value)}
              options={[
                { value: '', label: 'Wszystkie segmenty' },
                ...sectors.map((name) => ({ value: name, label: name })),
              ]}
            />
          </div>
          <span className="text-xs font-mono text-text-muted self-center">{shown.length} po filtrze</span>
        </div>
      </div>
      {loading ? (
        <p className="text-xs font-mono text-text-muted">Pobieram fundamenty GPW…</p>
      ) : shown.length === 0 ? (
        <p className="text-xs text-text-secondary">Publiczne zestawienie nie zwróciło spółek dla tego filtra.</p>
      ) : (
        <div className="overflow-x-auto border border-border-custom">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-surface text-3xs uppercase text-text-muted">
              <tr>
                {['Ticker', 'Spółka', 'Segment', 'C/Z', 'C/S', 'C/WK', 'ROE', 'Marża', 'r/r'].map((label) => (
                  <th key={label} className="px-2 py-2 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr
                  key={row.ticker}
                  role="button"
                  tabIndex={0}
                  className="border-t border-border-custom/60 cursor-pointer hover:bg-primary/5"
                  onClick={() => setSelected(row.ticker === selected ? null : row.ticker)}
                >
                  <td className="px-2 py-1.5 font-bold">{row.ticker}</td>
                  <td className="px-2 py-1.5 max-w-xs truncate">{row.name}</td>
                  <td className="px-2 py-1.5 text-text-secondary">{row.sector || '—'}</td>
                  <td className="px-2 py-1.5 tabular-nums">{cell(row.pe)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{cell(row.ps)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{cell(row.pb)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{cell(row.roe)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{cell(row.netMargin)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{cell(row.revenueYoy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <GpwCompanyDetail
        forecasts={forecasts}
        ticker={selected}
        periods={loadedTicker === selected ? periods : []}
        years={loadedTicker === selected ? years : []}
        ready={loadedTicker === selected}
      />
    </div>
  );
};
