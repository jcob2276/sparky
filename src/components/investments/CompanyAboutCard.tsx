import { FC } from 'react';
import Button from '../ui/Button';
import { Sparkles, Building2 } from 'lucide-react';
import type { CompanyDetailData } from '../../lib/investments/companyDetailService';

interface Props {
  data: CompanyDetailData;
  onAskAnalyst: (ticker: string) => void;
}

export const CompanyAboutCard: FC<Props> = ({ data, onAskAnalyst }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: About Company (2 cols on large) */}
      <div className="lg:col-span-2 bg-surface-elevated border border-border-custom rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-text-muted" />
          <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
            O Spółce
          </h3>
          <span className="text-3xs font-mono px-2 py-0.5 rounded-md bg-surface-subtle border border-border-custom text-text-muted">
            {data.exchange}
          </span>
        </div>

        <p className="text-xs leading-relaxed text-text-muted text-justify">
          {data.description || `${data.name} to spółka notowana na giełdzie ${data.exchange} w sektorze ${data.sector}.`}
        </p>
      </div>

      {/* Right: Ask AI Analyst CTA (1 col) */}
      <div className="bg-surface-elevated border border-border-custom rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
              Zapytaj Analityka AI
            </h3>
          </div>
          <p className="text-2xs text-text-muted leading-relaxed">
            Dowiedz się, dlaczego fundusze 13F i politycy kupują lub sprzedają akcje {data.ticker}, jaki jest sentyment i zbieżność transakcji.
          </p>
        </div>

        <div>
          <Button
            size="sm"
            variant="primary"
            icon={<Sparkles size={14} />}
            onClick={() => onAskAnalyst(data.ticker)}
            className="w-full justify-center rounded-xl text-xs font-bold uppercase tracking-wider"
          >
            Zapytaj o {data.ticker}
          </Button>
        </div>
      </div>
    </div>
  );
};
