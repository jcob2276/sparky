import { DashboardData } from '../../lib/investments/dashboardService';
export function DashboardKpiStack({ data, watchlistLength }: { data: DashboardData; watchlistLength: number }) {
  const cards = [
    { label: 'Zgłoszenia / 14 dni', value: data.watchlist14Count ?? '—', detail: `na ${watchlistLength} spółkach watchlisty; bez 13F` },
    { label: 'Bilans zmian 13F', value: data.topConsensus ? `${data.topConsensus.net > 0 ? '+' : ''}${data.topConsensus.net} ${data.topConsensus.ticker}` : '—', detail: 'dwa ostatnie kwartały; kompletne raporty SEC, pokrycie częściowe' },
    { label: 'Max short GPW', value: data.maxShort ? `${data.maxShort.totalPct.toFixed(2)}% ${data.maxShort.company}` : '—', detail: 'Publiczny rejestr KNF; zmiana 14 dni: brak potwierdzonego punktu bazowego' },
    { label: 'Ujawnienia Kongresu / 14 dni', value: data.congress14?.total ?? '—', detail: `sprzedaże: ${data.congress14?.sales ?? '—'} · zakupy: ${data.congress14?.buys ?? '—'}` },
  ];
  return <div className="flex flex-col gap-3 h-full">{cards.map(card => <div key={card.label} className="p-4 rounded-3xl bg-surface border border-border-custom flex-1">
    <div className="text-3xs uppercase text-text-muted">{card.label}</div>
    <div className="text-2xl font-bold font-mono mt-1">{card.value}</div>
    <div className="text-3xs text-text-secondary mt-1">{card.detail}</div>
  </div>)}</div>;
}
