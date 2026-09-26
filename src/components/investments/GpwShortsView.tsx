import { FC, useState, useEffect } from 'react';
import { CompanyShortSummary } from '../../lib/investments/knfShortsData';
import { fetchLiveGpwShorts } from '../../lib/investments/superinvestorsApi';
import { GpwShortsBreakdownModal } from './GpwShortsBreakdownModal';
import { GpwShortsHeaderBanner } from './GpwShortsHeaderBanner';
import Button from '../ui/Button';
import { notify } from '../../lib/notify';
import { Download } from 'lucide-react';

export const GpwShortsView: FC = () => {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [shorts, setShorts] = useState<CompanyShortSummary[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const live = await fetchLiveGpwShorts();
      if (!active) return;
      setShorts(live);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleExportCsv = () => {
    const headers = 'Ticker,Spółka,Łączny_Short_%,Liczba_Funduszy,Trend_14D_pp,Fundusze\n';
    const rows = shorts
      .map(
        (g) =>
          `"${g.ticker}","${g.companyName}","${g.totalShortPercent.toFixed(2)}","${g.fundsCount}","${g.netChange14d == null ? '' : g.netChange14d.toFixed(2)}","${g.positions.map((p) => `${p.holderName} (${p.shortPercent}%)`).join('; ')}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `knf_szorty_gpw_${new Date().getFullYear()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Wyeksportowano rejestr krótkiej sprzedaży KNF do CSV!', 'success');
  };

  const activeCompany = selectedTicker ? shorts.find((g) => g.ticker === selectedTicker) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info Banner */}
      <GpwShortsHeaderBanner grouped={shorts} />

      {/* Main Shorts Table */}
      <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-border-custom/50 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <span>📉</span> Spółki z ujawnionymi pozycjami krótkimi na GPW
            </h3>
            <span className="text-xs text-text-secondary font-mono">
              Kliknij spółkę, aby zobaczyć pozycje funduszy
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<Download size={13} />}
            onClick={handleExportCsv}
            className="rounded-xl text-xs font-semibold shrink-0"
          >
            Eksportuj CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface border-b border-border-custom/50 text-2xs text-text-secondary uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Spółka</th>
                <th className="py-3 px-4 text-right">Łączna pozycja krótka</th>
                <th className="py-3 px-4 text-center">Trend (14 dni)</th>
                <th className="py-3 px-4 text-center">Liczba funduszy</th>
                <th className="py-3 px-4">Fundusze z pozycjami</th>
                <th className="py-3 px-4 text-right">Wykres Stooq</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/40">
              {shorts.map((g: CompanyShortSummary) => {
                const isSelected = selectedTicker === g.ticker;
                return (
                  <tr
                    key={g.ticker}
                    onClick={() => setSelectedTicker(isSelected ? null : g.ticker)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-surface'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-surface border border-border-custom text-text-primary font-mono font-bold text-xs shadow-xs">
                          {g.ticker}.WA
                        </span>
                        <span className="font-semibold text-text-primary">{g.companyName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono tabular-nums bg-danger/15 text-danger border border-danger/30">
                        {g.totalShortPercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md text-2xs font-mono font-bold border ${
                          g.netChange14d != null && g.netChange14d > 0
                            ? 'bg-danger/15 text-danger border-danger/30'
                            : g.netChange14d != null && g.netChange14d < 0
                            ? 'bg-success/15 text-success border-success/30'
                            : 'bg-surface border-border-custom text-text-muted'
                        }`}
                      >
                        {g.netChange14d == null
                          ? '—'
                          : g.netChange14d > 0
                          ? `+${g.netChange14d.toFixed(2)} p.p.`
                          : `${g.netChange14d.toFixed(2)} p.p.`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-text-secondary font-semibold">
                      {g.fundsCount}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-text-secondary truncate max-w-md">
                      {g.positions.map((p) => `${p.holderName} (${p.shortPercent}%)`).join(', ')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <a
                        href={`https://stooq.pl/q/?s=${g.ticker.toLowerCase()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Wykres ↗
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Company Breakdown */}
      {activeCompany && (
        <GpwShortsBreakdownModal
          activeCompany={activeCompany}
          onClose={() => setSelectedTicker(null)}
        />
      )}
    </div>
  );
};
