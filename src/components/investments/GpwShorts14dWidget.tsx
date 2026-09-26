import { FC } from 'react';
import { Gpw14dMover } from '../../lib/investments/gpwShortsService';
import { CompanyLogo } from './CompanyLogo';

interface Props {
  increases: Gpw14dMover[];
  decreases: Gpw14dMover[];
  onSelectTicker: (ticker: string) => void;
}

export const GpwShorts14dWidget: FC<Props> = ({
  increases,
  decreases,
  onSelectTicker,
}) => {
  return (
    <div className="bg-surface border border-border-custom/70 rounded-2xl p-4 shadow-2xs space-y-3.5">
      <h4 className="text-xs font-bold text-text-primary tracking-tight uppercase font-mono">
        Zmiany 14 dni
      </h4>

      {/* WZROSTY */}
      <div className="space-y-1.5">
        <div className="text-3xs uppercase tracking-wider font-mono text-text-muted">
          Wzrosty
        </div>
        <div className="space-y-1">
          {increases.map((m) => (
            <div
              key={m.ticker}
              role="button"
              tabIndex={0}
              onClick={() => onSelectTicker(m.ticker)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectTicker(m.ticker)}
              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-elevated/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CompanyLogo ticker={m.ticker} name={m.name} size={22} />
                <span className="text-xs font-bold text-text-primary font-mono">{m.ticker}</span>
              </div>
              <span className="text-xs font-mono font-bold text-danger">
                +{m.diff14d.toFixed(2).replace('.', ',')} p.p.
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SPADKI */}
      <div className="space-y-1.5 pt-1 border-t border-border-custom/40">
        <div className="text-3xs uppercase tracking-wider font-mono text-text-muted">
          Spadki
        </div>
        <div className="space-y-1">
          {decreases.map((m) => (
            <div
              key={m.ticker}
              role="button"
              tabIndex={0}
              onClick={() => onSelectTicker(m.ticker)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectTicker(m.ticker)}
              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-elevated/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CompanyLogo ticker={m.ticker} name={m.name} size={22} />
                <span className="text-xs font-bold text-text-primary font-mono">{m.ticker}</span>
              </div>
              <span className="text-xs font-mono font-bold text-success">
                {m.diff14d.toFixed(2).replace('.', ',')} p.p.
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
