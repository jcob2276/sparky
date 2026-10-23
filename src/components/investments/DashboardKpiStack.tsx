import { DashboardData } from '../../lib/investments/dashboardService';
import { GroupedList, GroupedListRow } from '../ui/GroupedList';

export function DashboardKpiStack({ data, watchlistLength }: { data: DashboardData; watchlistLength: number }) {
  const cards = [
    { label: 'Zgłoszenia watchlisty / 14 dni', value: data.watchlist14Count ?? '—', detail: `na ${watchlistLength} spółkach; bez 13F` },
    { label: 'Bilans zmian 13F', value: data.topConsensus ? `${data.topConsensus.net > 0 ? '+' : ''}${data.topConsensus.net} ${data.topConsensus.ticker}` : '—', detail: 'dwa ostatnie kwartały; pokrycie częściowe' },
    { label: 'Największy short GPW', value: data.maxShort ? `${data.maxShort.totalPct.toFixed(2)}% ${data.maxShort.company}` : '—', detail: 'rejestr KNF; brak punktu bazowego zmiany 14 dni' },
    { label: 'Ujawnienia Kongresu / 14 dni', value: data.congress14?.total ?? '—', detail: `sprzedaże: ${data.congress14?.sales ?? '—'} · zakupy: ${data.congress14?.buys ?? '—'}` },
  ];
  return <GroupedList className="h-full">{cards.map(card => <GroupedListRow key={card.label} className="flex min-h-16 items-center justify-between gap-3 py-3">
    <div className="min-w-0">
      <p className="text-sm text-text-primary">{card.label}</p>
      <p className="text-xs text-text-muted">{card.detail}</p>
    </div>
    <p className="ui-num shrink-0 text-right text-base font-semibold">{card.value}</p>
  </GroupedListRow>)}</GroupedList>;
}
