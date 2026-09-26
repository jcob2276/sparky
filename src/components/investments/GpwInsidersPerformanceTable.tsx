import { FC, useState } from 'react';
import { GpwInsiderEffectiveness } from '../../lib/investments/gpwInsidersService';
import Button from '../ui/Button';

interface Props {
  data: GpwInsiderEffectiveness[];
  onSelectTicker?: (ticker: string) => void;
}

export const GpwInsidersPerformanceTable: FC<Props> = ({ data, onSelectTicker }) => {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="bg-surface border border-border-custom/70 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
      {/* Title & Info Link */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
            Skuteczność insiderów GPW (historycznie)
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowExplanation(!showExplanation)}
          className="text-3xs font-semibold text-primary"
        >
          {showExplanation ? 'Zamknij wyjaśnienie' : 'Jak to liczymy'}
        </Button>
      </div>

      {showExplanation && (
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-text-secondary leading-relaxed animate-fade-in">
          <p className="font-semibold text-text-primary mb-1">Metodologia oceny skuteczności insiderów:</p>
          <p>
            Mierzona medianą stóp zwrotu w horyzoncie 90 sesji giełdowych po zrealizowanym zakupie na tle mediany zwrotu całego uniwersum GPW w identycznym oknie czasowym. Różnica (Alfa) wskazuje nadwyżkę stopy zwrotu ponad rynek. Uwzględniane są osoby i podmioty z co najmniej trzema zarejestrowanymi transakcjami zakupu.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-custom/50 text-3xs uppercase font-mono tracking-wider text-text-muted">
              <th className="pb-2.5 font-semibold">Osoba</th>
              <th className="pb-2.5 font-semibold text-center">Nabycia w ocenie</th>
              <th className="pb-2.5 font-semibold text-right">Mediana 90s</th>
              <th className="pb-2.5 font-semibold text-right">Rynek 90s</th>
              <th className="pb-2.5 font-semibold text-right">Różnica</th>
              <th className="pb-2.5 font-semibold text-center">Spółki</th>
              <th className="pb-2.5 font-semibold text-right">Ostatnia transakcja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/40">
            {data.map((row) => {
              const diffPositive = row.diffPp >= 0;
              const marketPositive = row.market90s >= 0;
              const medianPositive = row.median90s >= 0;

              return (
                <tr key={row.id} className="hover:bg-primary/5 transition-colors">
                  {/* Osoba + Podmiot badge */}
                  <td className="py-2.5 text-text-primary font-medium">
                    <span className="mr-1.5">{row.personName}</span>
                    {row.isEntity && (
                      <span className="inline-block px-1.5 py-0.2 rounded-xs text-4xs font-mono uppercase bg-text-muted/10 text-text-muted border border-text-muted/20">
                        Podmiot
                      </span>
                    )}
                  </td>

                  {/* Nabycia w ocenie */}
                  <td className="py-2.5 text-center font-mono text-text-primary">
                    {row.evalBuysCount}
                  </td>

                  {/* Mediana 90s — UNBLURRED */}
                  <td
                    className={`py-2.5 text-right font-mono font-semibold ${
                      medianPositive ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {medianPositive ? `+${row.median90s.toFixed(2)}%` : `${row.median90s.toFixed(2)}%`}
                  </td>

                  {/* Rynek 90s */}
                  <td
                    className={`py-2.5 text-right font-mono ${
                      marketPositive ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {marketPositive ? `+${row.market90s.toFixed(2)}%` : `${row.market90s.toFixed(2)}%`}
                  </td>

                  {/* Różnica — UNBLURRED */}
                  <td className="py-2.5 text-right font-mono font-bold">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-sm ${
                        diffPositive
                          ? 'bg-success/10 text-success border border-success/20'
                          : 'bg-danger/10 text-danger border border-danger/20'
                      }`}
                    >
                      {diffPositive ? `+${row.diffPp.toFixed(2)} p.p.` : `${row.diffPp.toFixed(2)} p.p.`}
                    </span>
                  </td>

                  {/* Spółki */}
                  <td className="py-2.5 text-center font-mono">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectTicker?.(row.ticker)}
                      onKeyDown={(e) => e.key === 'Enter' && onSelectTicker?.(row.ticker)}
                      className="font-bold text-primary hover:underline cursor-pointer"
                    >
                      {row.ticker}
                    </span>
                  </td>

                  {/* Ostatnia transakcja */}
                  <td className="py-2.5 text-right font-mono text-3xs text-text-secondary whitespace-nowrap">
                    {row.lastTransactionDate}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footnote */}
      <div className="pt-2 border-t border-border-custom/40 text-3xs text-text-secondary leading-relaxed">
        Mediana zwrotu 90 sesji giełdowych po zakupach tej osoby na tle mediany całego uniwersum GPW w tym samym oknie, przy co najmniej 3 nabyciach. Wszystkie wartości skuteczności i alfy są odblokowane w pełnym trybie analitycznym.
      </div>
    </div>
  );
};
