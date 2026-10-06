import { DashboardData } from '../../lib/investments/dashboardService';
import Button from '../ui/Button';
interface Props { topConvergence: DashboardData['topConvergenceUsa']; topGpwShorts?: DashboardData['topGpwShorts']; onNavigateTab: (tab: string) => void }
export function DashboardBottomCards({ topConvergence, topGpwShorts = [], onNavigateTab }: Props) {
  return <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div className="p-5 rounded-3xl bg-surface border border-border-custom space-y-3">
      <h3 className="text-xs font-bold uppercase">Konsensus 13F w bazie</h3>
      {topConvergence.length === 0 && <p className="text-xs text-text-muted">Brak danych rankingu w odczycie.</p>}
      {topConvergence.map(item => <div key={item.ticker} className="flex justify-between text-xs"><span>{item.ticker} · {item.name}</span><span>{item.fundsNet > 0 ? '+' : ''}{item.fundsNet} netto</span></div>)}
      <p className="text-3xs text-text-muted">Kwartalne zmiany funduszy; bez punktacji i bez wnioskowania o zakupach polityków.</p>
      <Button size="sm" variant="ghost" onClick={() => onNavigateTab('stocks')}>Konsensus funduszy</Button>
    </div>
    <div className="p-5 rounded-3xl bg-surface border border-border-custom space-y-3">
      <h3 className="text-xs font-bold uppercase">Największe szorty GPW w bazie</h3>
      {topGpwShorts.length === 0 && <p className="text-xs text-text-muted">Brak danych pozycji w odczycie.</p>}
      {topGpwShorts.map(item => <div key={item.company} className="flex justify-between text-xs"><span>{item.company}</span><span>{item.totalPct.toFixed(2)}%</span></div>)}
      <p className="text-3xs text-text-muted">Publiczny rejestr KNF obejmuje pozycje od 0,5%; pokrycie źródła sprawdź w rejestrze.</p>
      <Button size="sm" variant="ghost" onClick={() => onNavigateTab('gpw_shorts')}>Rejestr KNF</Button>
    </div>
    <div className="p-5 rounded-3xl bg-surface border border-border-custom space-y-3">
      <h3 className="text-xs font-bold uppercase">Terminy ujawnień</h3>
      <p className="text-xs">13F: do 45 dni po końcu kwartału. Weekend i święta mogą przesunąć termin; aktualny kalendarz publikuje SEC.</p>
      <a href="https://www.sec.gov/divisions/investment/13ffaq" target="_blank" rel="noreferrer" className="text-xs text-primary">Terminy SEC Form 13F</a>
      <p className="text-xs">STOCK Act: wcześniej z dwóch terminów — 30 dni od informacji o transakcji albo 45 dni od transakcji. Nie ma jednego dnia dla wszystkich zgłoszeń.</p>
      <a href="https://ethics.house.gov/financial-disclosure/" target="_blank" rel="noreferrer" className="text-xs text-primary">Zasady House Ethics</a>
    </div>
  </div>;
}
