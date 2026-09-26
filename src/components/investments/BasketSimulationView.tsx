import { FC } from 'react';
import { TrendingUp } from 'lucide-react';

interface QuarterRow {
  quarter: string;
  basketReturn: number;
  cumulativeReturn: number;
  topStock: string;
}

const QUARTERS_DATA: QuarterRow[] = [
  { quarter: 'II 2026', basketReturn: 8.66, cumulativeReturn: 94.0, topStock: 'NVDA (+28.4%)' },
  { quarter: 'I 2026', basketReturn: -11.35, cumulativeReturn: 78.5, topStock: 'AMZN (-2.1%)' },
  { quarter: 'IV 2025', basketReturn: 7.64, cumulativeReturn: 101.4, topStock: 'AVGO (+19.2%)' },
  { quarter: 'III 2025', basketReturn: 9.06, cumulativeReturn: 87.1, topStock: 'GOOGL (+14.5%)' },
  { quarter: 'II 2025', basketReturn: 19.23, cumulativeReturn: 71.5, topStock: 'NVDA (+34.1%)' },
  { quarter: 'I 2025', basketReturn: -7.94, cumulativeReturn: 43.9, topStock: 'MSFT (+4.2%)' },
  { quarter: 'IV 2024', basketReturn: 8.64, cumulativeReturn: 56.3, topStock: 'AMZN (+16.8%)' },
  { quarter: 'III 2024', basketReturn: 8.82, cumulativeReturn: 43.8, topStock: 'AAPL (+11.2%)' },
  { quarter: 'II 2024', basketReturn: 0.19, cumulativeReturn: 32.2, topStock: 'META (+8.9%)' },
  { quarter: 'I 2024', basketReturn: 17.43, cumulativeReturn: 31.9, topStock: 'NVDA (+45.2%)' },
  { quarter: 'IV 2023', basketReturn: 15.29, cumulativeReturn: 12.3, topStock: 'AMAT (+21.0%)' },
  { quarter: 'III 2023', basketReturn: -2.56, cumulativeReturn: -2.6, topStock: 'CRH (+6.4%)' },
];

export const BasketSimulationView: FC = () => {
  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-custom/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-success/15 text-success border border-success/30">
                Backtest Strategii Zbieżności · 36 Miesięcy
              </span>
              <span className="text-2xs font-mono text-text-secondary">
                12 zamkniętych kwartałów
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Symulacja Koszyka Zbieżności (Top 20) vs S&P 500
            </h2>
            <p className="text-xs text-text-secondary mt-1.5 max-w-3xl leading-relaxed">
              Jak zachowywałaby się mechaniczna reguła: „Kup 20 spółek o najwyższej zbieżności zakupów funduszy 13F i polityków, rebalans co kwartał po ujawnieniach”.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-surface border border-border-custom/70 text-right shadow-xs">
              <div className="text-2xs text-text-secondary font-medium">Koszyk Zbieżności</div>
              <div className="text-2xl font-black text-success font-mono mt-0.5">+94,0%</div>
              <div className="text-3xs text-text-muted">36 miesięcy (3 lata)</div>
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-border-custom/70 text-right shadow-xs">
              <div className="text-2xs text-text-secondary font-medium">Benchmark S&P 500</div>
              <div className="text-2xl font-black text-text-primary font-mono mt-0.5">+74,4%</div>
              <div className="text-3xs text-success font-semibold">Alfa: +19,5 p.p.</div>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Kwartały na plusie</div>
            <div className="text-xl font-black text-success font-mono mt-1">9 / 12 (75%)</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Maks. obsunięcie (DD)</div>
            <div className="text-xl font-black text-danger font-mono mt-1">-11,3%</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Najlepszy kwartał</div>
            <div className="text-xl font-black text-success font-mono mt-1">+19,2% (II 2025)</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Trwający kwartał</div>
            <div className="text-xl font-black text-primary font-mono mt-1">+0,4% (Live)</div>
          </div>
        </div>
      </div>

      {/* Quarter by Quarter Table */}
      <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-border-custom/50 flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <span>📊</span> Wyniki historyczne: Kwartał po kwartale ({QUARTERS_DATA.length})
          </h3>
          <span className="text-xs text-text-secondary font-mono">
            Wycena portfela w dniu rebalansu (równa waga 5% na spółkę)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface border-b border-border-custom/50 text-2xs text-text-secondary uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Kwartał</th>
                <th className="py-3 px-4 text-right">Zwrot kwartalny</th>
                <th className="py-3 px-4 text-right">Wynik narastająco</th>
                <th className="py-3 px-4">Lider zysków w kwartale</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/40">
              {QUARTERS_DATA.map((row) => {
                const isPositive = row.basketReturn >= 0;
                return (
                  <tr key={row.quarter} className="hover:bg-primary/5 transition-colors">
                    <td className="py-3.5 px-4 font-bold font-mono text-text-primary">
                      {row.quarter}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-xs tabular-nums">
                      <span className={`inline-flex items-center gap-0.5 ${
                        isPositive ? 'text-success' : 'text-danger'
                      }`}>
                        {isPositive ? <TrendingUp size={12} /> : null}
                        {isPositive ? `+${row.basketReturn.toFixed(2)}%` : `${row.basketReturn.toFixed(2)}%`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-text-primary tabular-nums">
                      +{row.cumulativeReturn.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-text-secondary">
                      <span className="px-2 py-0.5 rounded-md bg-surface border border-border-custom text-text-primary font-mono text-2xs">
                        {row.topStock}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-md text-2xs font-semibold bg-success/10 text-success border border-success/20">
                        Zamknięty
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
