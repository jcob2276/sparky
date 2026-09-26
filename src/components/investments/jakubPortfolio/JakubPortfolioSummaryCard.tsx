import { FC } from 'react';
import { JakubPortfolioData } from '../../../lib/investments/jakubPortfolioStorage';
import { Wallet, TrendingDown, ArrowUpRight, Plus, RefreshCw, Zap } from 'lucide-react';
import Button from '../../ui/Button';

interface Props {
  portfolio: JakubPortfolioData;
  onOpenAddModal: () => void;
  onReset: () => void;
  onDiagnoseAI: () => void;
  onSyncMarket: () => void;
  isSyncing: boolean;
  lastSyncRates?: { usdPln: number; eurPln: number; date: string } | null;
}

export const JakubPortfolioSummaryCard: FC<Props> = ({
  portfolio,
  onOpenAddModal,
  onReset,
  onDiagnoseAI,
  onSyncMarket,
  isSyncing,
  lastSyncRates,
}) => {
  const isLoss = portfolio.totalPnlPln < 0;

  return (
    <div className="rounded-3xl border border-border-custom bg-surface p-5 sm:p-7 shadow-xs relative overflow-hidden space-y-6">
      {/* Background glow */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-primary/5 rounded-full pointer-events-none" />

      {/* Top row: Account title and quick actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
            <Wallet size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-text-primary tracking-tight">
                {portfolio.accountName}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-4xs font-mono font-bold bg-primary/10 text-primary border border-primary/25 uppercase">
                Rachunek maklerski • {portfolio.positions.length} pozycje
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-3xs text-text-muted mt-0.5">
              <span>Portfel inwestycyjny Jakuba • Akcje & ETF</span>
              {lastSyncRates && (
                <span className="text-4xs font-mono font-bold px-1.5 py-0.2 rounded-md bg-success/10 text-success border border-success/25">
                  NBP {lastSyncRates.date}: USD {lastSyncRates.usdPln.toFixed(2)} zł • EUR {lastSyncRates.eurPln.toFixed(2)} zł
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={onSyncMarket}
            disabled={isSyncing}
            className="rounded-xl text-xs gap-1.5 border-success/40 text-success hover:bg-success/10"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Pobieranie kursów...' : 'Zsynchronizuj z rynkiem'}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onDiagnoseAI}
            className="rounded-xl text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
          >
            <Zap size={13} className="fill-primary" />
            <span>Diagnoza AI & Jev</span>
          </Button>

          <Button
            size="sm"
            variant="tonal"
            onClick={onOpenAddModal}
            className="rounded-xl text-xs gap-1"
          >
            <Plus size={14} />
            <span>Zarządzaj</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onReset}
            title="Przywróć stan początkowy portfela"
            className="rounded-xl text-text-muted hover:text-text-primary px-2"
          >
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* Hero value display matching the mobile app */}
      <div className="space-y-1.5">
        <div className="text-2xl sm:text-4xl font-black font-mono tracking-tight text-text-primary">
          {portfolio.totalValuePln.toLocaleString('pl-PL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          <span className="text-base sm:text-xl font-bold text-text-muted">PLN</span>
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm font-mono">
          <span className="text-text-muted">Zysk:</span>
          <span
            className={`inline-flex items-center gap-1 font-bold ${
              isLoss ? 'text-danger' : 'text-success'
            }`}
          >
            {isLoss ? <TrendingDown size={14} /> : <ArrowUpRight size={14} />}
            <span>
              {portfolio.totalPnlPln > 0 ? '+' : ''}
              {portfolio.totalPnlPln.toLocaleString('pl-PL', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              PLN ({portfolio.totalPnlPct > 0 ? '+' : ''}
              {portfolio.totalPnlPct.toFixed(2)}%)
            </span>
          </span>
        </div>
      </div>

      {/* Sub-metrics 3 columns matching screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border-custom/50">
        <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-border-custom/60 space-y-1">
          <div className="text-3xs font-mono text-text-muted uppercase">Wartość rynkowa</div>
          <div className="text-base sm:text-lg font-black font-mono text-text-primary">
            {portfolio.marketValuePln.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}{' '}
            <span className="text-2xs font-normal text-text-muted">PLN</span>
          </div>
          <div className="text-4xs text-text-muted">Wycena {portfolio.positions.length} otwartych pozycji</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-border-custom/60 space-y-1">
          <div className="text-3xs font-mono text-text-muted uppercase">Wolne środki</div>
          <div className="text-base sm:text-lg font-black font-mono text-success">
            {portfolio.freeCashPln.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}{' '}
            <span className="text-2xs font-normal text-text-muted">PLN</span>
          </div>
          <div className="text-4xs text-text-muted">
            Gotówka gotowa do alokacji ({((portfolio.freeCashPln / (portfolio.totalValuePln || 1)) * 100).toFixed(1)}%)
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-border-custom/60 space-y-1">
          <div className="text-3xs font-mono text-text-muted uppercase">Alokacja kapitału</div>
          <div className="text-base sm:text-lg font-black font-mono text-primary">
            {((portfolio.marketValuePln / (portfolio.totalValuePln || 1)) * 100).toFixed(1)}% / {((portfolio.freeCashPln / (portfolio.totalValuePln || 1)) * 100).toFixed(1)}%
          </div>
          <div className="text-4xs text-text-muted">Akcje & ETF / Gotówka</div>
        </div>
      </div>
    </div>
  );
};
