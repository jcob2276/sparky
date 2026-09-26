import { FC, useMemo, useState } from 'react';
import Button from '../ui/Button';
import { notify } from '../../lib/notify';
import { Download, Copy, Bell } from 'lucide-react';
import type { SignalRow, SignalWindow } from '../../lib/investments/signalsApi';
import { useSignalBoard } from './useSignalBoard';
import { SignalsTable } from './SignalsTable';

const PAGE = 100;

interface Props {
  watchlist: string[];
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
        .join(','),
    )
    .join('\n');
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sygnaly_zbieznosci_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export const ConvergenceView: FC<Props> = ({ watchlist }) => {
  const [window, setWindow] = useState<SignalWindow>('90d');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [visibleRest, setVisibleRest] = useState(PAGE);
  const { rows, alerts, loading, error, dismissAlerts } = useSignalBoard(window);
  const windowLabel = window === '90d' ? '90 DNI' : '12 MIES.';

  const filtered = useMemo(() => {
    if (!watchlistOnly) return rows;
    const wanted = new Set(watchlist.map((ticker) => ticker.replace(/\.WA$/i, '').toUpperCase()));
    return rows.filter((row) => wanted.has(row.ticker));
  }, [rows, watchlist, watchlistOnly]);

  const convergent = filtered.filter((row) => row.convergent);
  const rest = filtered.filter((row) => !row.convergent);
  const restPage = rest.slice(0, visibleRest);

  const copyRanking = () => {
    const text = filtered
      .map((row) => `${row.score} ${row.ticker} (${row.companyName}): ${row.summary}`)
      .join('\n');
    void navigator.clipboard.writeText(text);
    notify('Skopiowano ranking zbieżności.', 'success');
  };

  return (
    <div className="space-y-4 animate-fade-in text-text-primary">
      <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-primary">Zbieżność ujawnień</div>
            <h2 className="text-xl font-extrabold tracking-tight mt-1">Trzy źródła. Jedna tabela.</h2>
            <p className="text-xs text-text-secondary mt-1.5 max-w-2xl leading-relaxed">
              Spółki kupowane równolegle przez fundusze 13F, polityków i insiderów. Zestawienie opisuje fakt o danych, nie zalecenie.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-3xs font-mono text-text-muted">3 źródła · okno {windowLabel}</span>
            {(['90d', '365d'] as const).map((option) => (
              <Button
                key={option}
                size="sm"
                variant={window === option ? 'primary' : 'secondary'}
                className="rounded-xl text-xs"
                onClick={() => {
                  setWindow(option);
                  setVisibleRest(PAGE);
                }}
              >
                {option === '90d' ? '90 dni' : '12 mies.'}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={watchlistOnly ? 'primary' : 'secondary'}
            className="rounded-xl text-xs"
            onClick={() => setWatchlistOnly((prev) => !prev)}
          >
            Watchlista ({watchlist.length})
          </Button>
          <Button size="sm" variant="secondary" icon={<Copy size={13} />} className="rounded-xl text-xs" onClick={copyRanking} disabled={filtered.length === 0}>
            Kopiuj
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<Download size={13} />}
            className="rounded-xl text-xs"
            disabled={filtered.length === 0}
            onClick={() => {
              exportCsv(filtered);
              notify('Wyeksportowano pełny zbiór CSV.', 'success');
            }}
          >
            Eksport CSV
          </Button>
        </div>
      </div>

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
      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-text-secondary">
          Brak zbieżności w tym oknie. Poszerz okno do 12 miesięcy albo wróć po najbliższej synchronizacji ujawnień.
        </p>
      )}

      {!loading && convergent.length > 0 && (
        <SignalsTable
          title={`Zbieżne (${convergent.length}): fundusze i politycy kupują`}
          windowLabel={windowLabel}
          rows={convergent}
        />
      )}
      {!loading && restPage.length > 0 && (
        <SignalsTable
          title={`Pozostała aktywność polityków w spółkach 13F (${rest.length})`}
          windowLabel={windowLabel}
          rows={restPage}
        />
      )}
      {!loading && visibleRest < rest.length && (
        <Button
          size="sm"
          variant="secondary"
          className="w-full rounded-xl text-xs"
          onClick={() => setVisibleRest((count) => count + PAGE)}
        >
          Pokaż kolejne {Math.min(PAGE, rest.length - visibleRest)} z {rest.length - visibleRest}
        </Button>
      )}

      <p className="text-3xs font-mono text-text-muted leading-relaxed max-w-4xl">
        Ocena = pozycja percentylowa ważonych źródeł (40% fundusze 13F netto, 24% netto transakcji polityków, 16% liczby kupujących polityków, 20% insiderzy; bez danych insiderskich 50/30/20) w oknie {windowLabel}. Porządkuje listę, nie jest prognozą ani oceną spółki. Kwoty transakcji polityków to środki widełek z ujawnień STOCK Act.
      </p>
    </div>
  );
};
