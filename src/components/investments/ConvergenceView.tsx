import { FC, useMemo, useState } from 'react';
import Button from '../ui/Button';
import { notify } from '../../lib/notify';
import { Bell } from 'lucide-react';
import type { SignalRow, SignalWindow } from '../../lib/investments/signalsApi';
import { useSignalBoard } from './useSignalBoard';
import { SignalsTable } from './SignalsTable';
import { ConvergenceHeader } from './ConvergenceHeader';

const PAGE = 50;

interface Props {
  watchlist: string[];
  onNavigateTab?: (tab: string) => void;
}

function exportCsv(rows: SignalRow[]) {
  const header = 'Ticker,Spolka,Ocena,Zbiezne,Fundusze_netto,Kupna_politykow,Sprzedaze_politykow,Kupujacy_politycy,Insiderzy_kupno,Wolumen_srodek_USD,Ostatnia,Dowody\n';
  const body = rows
    .map((row) =>
      [
        row.ticker,
        row.companyName,
        row.score,
        row.convergent ? 'tak' : 'nie',
        row.fundNetBuyers,
        row.polBuys,
        row.polSells,
        row.politicianBuyers,
        row.insiderBuys,
        Math.round(row.buyVolumeMid),
        row.lastTradeDate ?? '',
        row.summary,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `zbieznosc_ujawnien_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export const ConvergenceView: FC<Props> = ({ watchlist, onNavigateTab }) => {
  const [window, setWindow] = useState<SignalWindow>('90d');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [filterTab, setFilterTab] = useState<'convergent' | 'all'>('convergent');
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const { rows, alerts, loading, error, dismissAlerts } = useSignalBoard(window);
  const windowLabel = window === '90d' ? '90 DNI' : '12 MIES.';

  const filteredByWatchlist = useMemo(() => {
    if (!watchlistOnly) return rows;
    const wanted = new Set(watchlist.map((ticker) => ticker.replace(/\.WA$/i, '').toUpperCase()));
    return rows.filter((row) => wanted.has(row.ticker));
  }, [rows, watchlist, watchlistOnly]);

  const convergent = useMemo(
    () => filteredByWatchlist.filter((row) => row.convergent),
    [filteredByWatchlist]
  );

  const displayRows = useMemo(() => {
    if (filterTab === 'convergent') return convergent;
    return filteredByWatchlist;
  }, [filterTab, convergent, filteredByWatchlist]);

  const paginatedRows = displayRows.slice(0, visibleCount);

  const handleCopyRanking = () => {
    const text = displayRows
      .map((row) => `${row.score} ${row.ticker} (${row.companyName}): ${row.summary}`)
      .join('\n');
    void navigator.clipboard.writeText(text);
    notify('Skopiowano ranking zbieżności.', 'success');
  };

  const handleExportCsv = () => {
    exportCsv(displayRows);
    notify('Wyeksportowano pełny zbiór CSV.', 'success');
  };

  return (
    <div className="space-y-4 animate-fade-in text-text-primary">
      <ConvergenceHeader
        window={window}
        windowLabel={windowLabel}
        onWindowChange={(w) => {
          setWindow(w);
          setVisibleCount(PAGE);
        }}
        filterTab={filterTab}
        onFilterTabChange={(t) => {
          setFilterTab(t);
          setWatchlistOnly(false);
        }}
        watchlistOnly={watchlistOnly}
        onToggleWatchlistOnly={() => setWatchlistOnly((prev) => !prev)}
        convergentCount={convergent.length}
        totalCount={filteredByWatchlist.length}
        watchlistCount={watchlist.length}
        onCopyRanking={handleCopyRanking}
        onExportCsv={handleExportCsv}
        hasRows={displayRows.length > 0}
        onNavigateTab={onNavigateTab}
      />

      {alerts.length > 0 && (
        <div className="p-4 rounded-3xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center gap-3">
          <Bell size={16} className="text-primary shrink-0" />
          <p className="text-xs text-text-secondary flex-1">
            Nowa zbieżność od ostatniego odczytu: {alerts.map((row) => `${row.ticker} (${row.score})`).join(', ')}.
          </p>
          <Button size="sm" variant="secondary" className="rounded-xl text-xs" onClick={dismissAlerts}>
            Oznacz jako przeczytane
          </Button>
        </div>
      )}

      {loading && <p className="text-sm text-text-secondary">Liczenie zbieżności…</p>}
      {error && <p className="text-sm text-danger">{error}. Spróbuj ponownie za chwilę.</p>}
      {!loading && !error && displayRows.length === 0 && (
        <p className="text-sm text-text-secondary">
          Brak zbieżności w tym oknie. Poszerz okno do 12 miesięcy albo wróć po najbliższej synchronizacji ujawnień.
        </p>
      )}

      {!loading && paginatedRows.length > 0 && (
        <SignalsTable rows={paginatedRows} />
      )}

      {!loading && visibleCount < displayRows.length && (
        <Button
          size="sm"
          variant="secondary"
          className="w-full rounded-xl text-xs font-semibold"
          onClick={() => setVisibleCount((count) => count + PAGE)}
        >
          Pokaż kolejne {Math.min(PAGE, displayRows.length - visibleCount)} z {displayRows.length - visibleCount}
        </Button>
      )}

      <p className="text-3xs font-mono text-text-muted leading-relaxed max-w-4xl">
        Ocena = pozycja percentylowa ważonych źródeł (40% fundusze 13F netto, 24% netto transakcji polityków, 16% liczby kupujących polityków, 20% insiderzy; bez danych insiderskich 50/30/20) w oknie {windowLabel}. Porządkuje listę, nie jest prognozą ani oceną spółki. Kwoty transakcji polityków to środki widełek z ujawnień STOCK Act.
      </p>
    </div>
  );
};
