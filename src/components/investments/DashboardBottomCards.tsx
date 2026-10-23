import { DashboardData } from '../../lib/investments/dashboardService';
import Button from '../ui/Button';
import { GroupedList, GroupedListRow } from '../ui/GroupedList';

interface Props { topConvergence: DashboardData['topConvergenceUsa']; topGpwShorts?: DashboardData['topGpwShorts']; onNavigateTab: (tab: string) => void }

interface RankedSectionProps {
  title: string;
  empty: string;
  note: string;
  actionLabel: string;
  onAction: () => void;
  rows: Array<{ key: string; label: string; value: string }>;
}

function RankedSection({ title, empty, note, actionLabel, onAction, rows }: RankedSectionProps) {
  return <section className="space-y-2">
    <h3 className="px-1 text-base font-semibold text-text-primary">{title}</h3>
    {rows.length === 0
      ? <p className="rounded-2xl bg-surface-1 px-4 py-6 text-center text-sm text-text-muted">{empty}</p>
      : <GroupedList>{rows.map(row => <GroupedListRow key={row.key} className="flex min-h-12 items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate">{row.label}</span>
        <span className="ui-num shrink-0 font-semibold">{row.value}</span>
      </GroupedListRow>)}</GroupedList>}
    <p className="px-1 text-xs text-text-muted">{note}</p>
    <Button size="sm" variant="ghost" onClick={onAction} className="min-h-11">{actionLabel}</Button>
  </section>;
}

export function DashboardBottomCards({ topConvergence, topGpwShorts = [], onNavigateTab }: Props) {
  return <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
    <RankedSection
      title="Konsensus 13F w bazie"
      empty="Brak danych rankingu w odczycie."
      note="Kwartalne zmiany funduszy; bez punktacji i bez wnioskowania o zakupach polityków."
      actionLabel="Konsensus funduszy"
      onAction={() => onNavigateTab('stocks')}
      rows={topConvergence.map(item => ({ key: item.ticker, label: `${item.ticker} · ${item.name}`, value: `${item.fundsNet > 0 ? '+' : ''}${item.fundsNet} netto` }))}
    />
    <RankedSection
      title="Największe szorty GPW"
      empty="Brak danych pozycji w odczycie."
      note="Publiczny rejestr KNF obejmuje pozycje od 0,5%; pokrycie źródła sprawdź w rejestrze."
      actionLabel="Rejestr KNF"
      onAction={() => onNavigateTab('gpw_shorts')}
      rows={topGpwShorts.map(item => ({ key: item.company, label: item.company, value: `${item.totalPct.toFixed(2)}%` }))}
    />
    <section className="space-y-2">
      <h3 className="px-1 text-base font-semibold text-text-primary">Terminy ujawnień</h3>
      <div className="space-y-3 rounded-2xl bg-surface-1 p-4 text-sm text-text-secondary">
        <p>13F: do 45 dni po końcu kwartału. Weekend i święta mogą przesunąć termin; aktualny kalendarz publikuje SEC.</p>
        <a href="https://www.sec.gov/divisions/investment/13ffaq" target="_blank" rel="noreferrer" className="inline-block min-h-11 py-2.5 text-primary">Terminy SEC Form 13F</a>
        <p>STOCK Act: wcześniej z dwóch terminów — 30 dni od informacji o transakcji albo 45 dni od transakcji. Nie ma jednego dnia dla wszystkich zgłoszeń.</p>
        <a href="https://ethics.house.gov/financial-disclosure/" target="_blank" rel="noreferrer" className="inline-block min-h-11 py-2.5 text-primary">Zasady House Ethics</a>
      </div>
    </section>
  </div>;
}
