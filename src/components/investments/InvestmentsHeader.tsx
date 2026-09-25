import { FC } from 'react';
import { InvestmentStats } from '../../lib/investments/investmentsApi';
import Button from '../ui/Button';

interface Props {
  stats: InvestmentStats | null;
  syncing: boolean;
  onRefresh: () => void;
}

export const InvestmentsHeader: FC<Props> = ({ stats, syncing, onRefresh }) => {
  return (
    <header className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-custom/60">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
              Live Tracker 100% Free
            </span>
            <span className="text-xs text-text-secondary font-mono">STOCK Act · SEC</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight">
            Radar Inwestycji Kongresu & Insiderów
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            Śledź oficjalne transakcje senatorów, kongresmenów i Donalda Trumpa bez sztucznych paywalli OrcaFolio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={onRefresh}
            disabled={syncing}
            loading={syncing}
            className="rounded-xl border border-border-custom/60"
          >
            {syncing ? 'Synchronizuję...' : 'Odśwież feed'}
          </Button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-3.5 rounded-xl bg-surface border border-border-custom/50">
            <div className="text-xs font-medium text-text-secondary">Wszystkie transakcje</div>
            <div className="text-xl font-semibold text-text-primary mt-1 font-mono">{stats.totalTrades.toLocaleString()}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface border border-border-custom/50">
            <div className="text-xs font-medium text-success flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              Zarejestrowane kupna
            </div>
            <div className="text-xl font-semibold text-success mt-1 font-mono">{stats.purchasesCount.toLocaleString()}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface border border-border-custom/50">
            <div className="text-xs font-medium text-danger flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" />
              Zarejestrowane sprzedaże
            </div>
            <div className="text-xl font-semibold text-danger mt-1 font-mono">{stats.salesCount.toLocaleString()}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface border border-border-custom/50">
            <div className="text-xs font-medium text-primary">Aktywni politycy</div>
            <div className="text-xl font-semibold text-primary mt-1 font-mono">{stats.distinctFilers.toLocaleString()}</div>
          </div>
        </div>
      )}
    </header>
  );
};
