import { FC } from 'react';
import { CompanyShortSummary } from '../../lib/investments/knfShortsData';

interface Props {
  grouped: CompanyShortSummary[];
}

export const GpwShortsHeaderBanner: FC<Props> = ({ grouped }) => {
  return (
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
  );
};
