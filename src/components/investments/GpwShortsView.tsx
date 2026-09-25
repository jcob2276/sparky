import { FC, useState } from 'react';
import { getGroupedCompanyShorts, CompanyShortSummary } from '../../lib/investments/knfShortsData';
import Button from '../ui/Button';

export const GpwShortsView: FC = () => {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const grouped = getGroupedCompanyShorts();

  const activeCompany = selectedTicker ? grouped.find((g) => g.ticker === selectedTicker) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info Banner */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-custom/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-danger/15 text-danger border border-danger/30">
                Rejestr Krótkiej Sprzedaży KNF
              </span>
              <span className="text-2xs font-mono text-text-secondary">
                Pozycje krótkie netto &ge; 0.5% akcji
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Krótka sprzedaż GPW (Szorty na polskich spółkach)
            </h2>
            <p className="text-xs text-text-secondary mt-1.5 max-w-3xl leading-relaxed">
              Oficjalne dane publikowane przez Komisję Nadzoru Finansowego (KNF). Dowiedz się, które polskie spółki z GPW są pod ostrzałem globalnych funduszy hedgingowych (AQR, Marshall Wace, Citadel, Point72) i jaka część akcji jest zaszortowana.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border-custom/70 text-right shrink-0 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Najbardziej szortowana</div>
            <div className="text-2xl font-black text-danger font-mono mt-0.5">
              {grouped[0]?.ticker} ({grouped[0]?.totalShortPercent}%)
            </div>
            <div className="text-3xs text-text-secondary mt-1">
              {grouped[0]?.companyName}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Szortowane spółki</div>
            <div className="text-xl font-black text-text-primary font-mono mt-1">{grouped.length} emitentów</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-danger">Próg raportowania</div>
            <div className="text-xl font-black text-danger font-mono mt-1">&ge; 0.50%</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-primary">Regulacja UE</div>
            <div className="text-xl font-black text-primary font-mono mt-1">Rozp. 236/2012</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Częstotliwość</div>
            <div className="text-xl font-black text-text-primary font-mono mt-1">Dzień po sesji</div>
          </div>
        </div>
      </div>

      {/* Main Shorts Table */}
      <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-border-custom/50 flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <span>📉</span> Spółki z ujawnionymi pozycjami krótkimi na GPW
          </h3>
          <span className="text-xs text-text-secondary font-mono">
            Kliknij spółkę, aby zobaczyć pozycje funduszy
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface border-b border-border-custom/50 text-2xs text-text-secondary uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Spółka</th>
                <th className="py-3 px-4 text-right">Łączna pozycja krótka</th>
                <th className="py-3 px-4 text-center">Liczba funduszy</th>
                <th className="py-3 px-4">Fundusze z pozycjami</th>
                <th className="py-3 px-4 text-right">Wykres Stooq</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/40">
              {grouped.map((g: CompanyShortSummary) => {
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
        <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-custom/50">
            <h4 className="text-base font-bold text-text-primary flex items-center gap-2">
              <span>🔍</span> Szczegółowy wykaz funduszy szortujących {activeCompany.companyName} ({activeCompany.ticker})
            </h4>
            <Button size="sm" variant="ghost" onClick={() => setSelectedTicker(null)} className="text-xs">
              ✕ Zamknij
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeCompany.positions.map((pos) => (
              <div key={pos.id} className="p-3.5 rounded-2xl bg-surface border border-border-custom shadow-xs">
                <div className="text-xs font-bold text-text-primary mb-1">{pos.holderName}</div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-custom/40">
                  <span className="text-2xs text-text-secondary font-mono">Data: {pos.positionDate}</span>
                  <span className="font-mono text-sm font-black text-danger">{pos.shortPercent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
