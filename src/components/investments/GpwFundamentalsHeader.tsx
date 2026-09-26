import { FC } from 'react';

interface Props {
  refreshedDate: string;
  onNavigateTab?: (tab: string) => void;
}

export const GpwFundamentalsHeader: FC<Props> = ({
  refreshedDate,
  onNavigateTab,
}) => {
  return (
    <div className="space-y-4">
      {/* Title & Refreshed Date */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
            Fundamenty GPW
          </h1>
          <p className="text-xs text-text-secondary mt-1 max-w-3xl leading-relaxed">
            Wskaźniki z raportów okresowych 385 spółek rynku głównego. Filtry nazwane warunkiem, nie
            oceną: to, co spełnia próg, jest faktem o danych, nie rekomendacją.
          </p>
        </div>

        <div className="text-3xs font-mono font-medium text-text-muted shrink-0">
          odświeżono {refreshedDate}
        </div>
      </div>

      {/* 3 GPW Sub-tabs */}
      <div className="flex items-center gap-6 border-b border-border-custom/50 pt-2">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab?.('gpw_shorts')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateTab?.('gpw_shorts')}
          className="pb-3 text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Krótka sprzedaż
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigateTab?.('stocks')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigateTab?.('stocks')}
          className="pb-3 text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Insiderzy (ESPI)
        </div>
        <div
          className="pb-3 text-xs sm:text-sm font-bold text-primary border-b-2 border-primary cursor-default"
        >
          Fundamenty
        </div>
      </div>
    </div>
  );
};
