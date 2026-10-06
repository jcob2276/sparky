import { FC } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { SuperinvestorDetailHeader } from './SuperinvestorDetailHeader';
import { SuperinvestorQuarterChart } from './SuperinvestorQuarterChart';
import { SuperinvestorHoldingsTable } from './SuperinvestorHoldingsTable';
import { SuperinvestorSidePanels } from './SuperinvestorSidePanels';
import Button from '../ui/Button';
import { useSuperinvestorDetail } from '../../lib/investments/useSuperinvestors';

interface Props {
  investorId: string;
  onBack: () => void;
  onSelectTicker?: (ticker: string) => void;
}

export const SuperinvestorDetailView: FC<Props> = ({
  investorId,
  onBack,
  onSelectTicker,
}) => {
  const query = useSuperinvestorDetail(investorId);
  const data = query.data;
  if (query.isPending) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="text-xs font-mono text-text-muted">Pobieranie portfela 13F i historii kwartalnej...</div>
      </div>
    );
  }
  if (query.error) return <div role="alert" className="p-8 space-y-4">
    <p>Nie udało się pobrać pozycji SEC. {query.error.message}</p>
    <Button onClick={() => void query.refetch()}>Ponów</Button>
    <Button variant="secondary" onClick={onBack}>Powrót do listy</Button>
  </div>;

  if (!data) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-sm font-semibold text-text-secondary">Nie znaleziono danych inwestora</div>
        <Button size="sm" variant="secondary" onClick={onBack}>
          Powrót do listy
        </Button>
      </div>
    );
  }

  const { investor } = data;

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      {/* Back button */}
      <div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onBack}
          className="text-xs font-mono font-bold text-text-secondary hover:text-text-primary pl-0 gap-1.5"
        >
          <ArrowLeft size={14} />
          SUPERINWESTORZY
        </Button>
      </div>

      {/* Header Profile & 4 KPI Cards */}
      <SuperinvestorDetailHeader
        investor={investor}
        basketValueFormatted={data.basketValueFormatted}
        positionsCount={data.positionsCount}
        newCount={data.newCount}
        soldCount={data.soldCount}
      />

      {/* Performance Curve Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-2xs space-y-1.5">
        <h3 className="text-xs sm:text-sm font-black text-text-primary tracking-wider uppercase font-mono">
          Stan ujawnionych pozycji · {data.periodQuarter}
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed max-w-4xl">
          Tabela obejmuje wszystkie odczytane pozycje długie raportowane w akcjach (SH), bez opcji i pozycji PRN.
          Wagi odnoszą się do tej części raportu. Zmiana liczby akcji między raportami nie dowodzi wykonania transakcji.
          {data.previousPeriod ? ` Porównanie ze stanem na ${data.previousPeriod}.` : ' Brak zweryfikowanego poprzedniego kwartału — zmiany pozostają nieznane.'}
          {investor.reportWarning && ' Suma odczytanych pozycji różni się od podsumowania dokumentu; pokazujemy wartości pozycji.'}
        </p>
      </div>

      {/* Two-column Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <SuperinvestorQuarterChart
            quarters={data.quarters}
            quarterGrowthPct={data.quarterGrowthPct}
          />

          <SuperinvestorHoldingsTable
            holdings={data.holdings}
            newCount={data.newCount}
            decreasedCount={data.decreasedCount}
            increasedCount={data.increasedCount}
            soldCount={data.soldCount}
            filingUrl={data.latestFilingUrl}
            previousFilingUrl={data.previousFilingUrl}
            onSelectTicker={onSelectTicker}
          />
        </div>

        {/* Right Column (1/3 width) */}
        <div>
          <SuperinvestorSidePanels
            basketValueFormatted={data.basketValueFormatted}
            holdings={data.holdings}
            sectors={data.sectors}
            periodQuarter={data.periodQuarter}
            recentActivity={data.recentActivity}
          />
        </div>
      </div>
    </div>
  );
};
