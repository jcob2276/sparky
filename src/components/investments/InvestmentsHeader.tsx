import { FC } from 'react';
import { InvestmentStats } from '../../lib/investments/investmentsApi';
import Button from '../ui/Button';

interface Props {
  stats: InvestmentStats | null;
  syncing: boolean;
  onRefresh: () => void;
  onOpenPlaybook: () => void;
}

export const InvestmentsHeader: FC<Props> = ({ stats, syncing, onRefresh, onOpenPlaybook }) => {
  return (
    <header className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-custom/50">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/30">
              Live Tracker 100% Free
            </span>
            <span className="text-xs text-text-secondary font-mono">
              STOCK Act · SEC · KNF MAR
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">
            Radar Inwestycji Kongresu USA & GPW
          </h1>
          <p className="text-sm text-text-secondary mt-1.5 max-w-2xl leading-normal">
            Śledź oficjalne transakcje senatorów, kongresmenów, Donalda Trumpa oraz członków zarządów spółek z GPW bez sztucznych paywalli OrcaFolio.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="ghost"
            onClick={onOpenPlaybook}
            className="rounded-xl border border-border-custom/60 text-xs font-semibold"
          >
            🧠 Jak kopiować?
          </Button>
          <Button
            variant="secondary"
            onClick={onRefresh}
            disabled={syncing}
            loading={syncing}
            className="rounded-xl border border-border-custom/60 text-xs font-semibold"
          >
            {syncing ? 'Synchronizuję...' : 'Odśwież feed'}
          </Button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-4 rounded-2xl bg-surface border border-border-custom/70 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Wszystkie transakcje</div>
            <div className="text-2xl font-bold text-text-primary mt-1 font-mono tabular-nums">{stats.totalTrades.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-2xl bg-surface border border-border-custom/70 shadow-xs">
            <div className="text-xs font-medium text-success flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success inline-block" />
              Zarejestrowane kupna
            </div>
            <div className="text-2xl font-bold text-success mt-1 font-mono tabular-nums">{stats.purchasesCount.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-2xl bg-surface border border-border-custom/70 shadow-xs">
            <div className="text-xs font-medium text-danger flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-danger inline-block" />
              Zarejestrowane sprzedaże
            </div>
            <div className="text-2xl font-bold text-danger mt-1 font-mono tabular-nums">{stats.salesCount.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-2xl bg-surface border border-border-custom/70 shadow-xs">
            <div className="text-xs font-medium text-primary">Aktywni insiderzy</div>
            <div className="text-2xl font-bold text-primary mt-1 font-mono tabular-nums">{stats.distinctFilers.toLocaleString()}</div>
          </div>
        </div>
      )}
    </header>
  );
};
