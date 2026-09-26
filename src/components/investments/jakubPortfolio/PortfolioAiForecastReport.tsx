import { FC } from 'react';
import { Zap, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import Button from '../../ui/Button';

interface Props {
  reportText: string | null;
  loading: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

export const PortfolioAiForecastReport: FC<Props> = ({
  reportText,
  loading,
  onRefresh,
  onClose,
}) => {
  if (!loading && !reportText) return null;

  return (
    <div className="rounded-2xl border border-primary/30 bg-surface-elevated/70 p-4 sm:p-6 shadow-sm space-y-4 animate-fade-in relative overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border-custom/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/25">
            <Zap size={16} className="fill-primary" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-text-primary tracking-tight">
              Głęboki Raport Predykcyjny AI & Jev
            </h4>
            <p className="text-4xs font-mono text-text-muted">
              Model: Gemini 2.5 Flash · System Jev · Konsensus 13F & GPW
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-xl text-3xs font-mono text-text-muted hover:text-text-primary px-2"
            title="Przelicz ponownie"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline ml-1">Odśwież</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl text-text-muted hover:text-text-primary px-1.5"
            title="Zamknij raport"
          >
            <X size={15} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <RefreshCw size={20} className="animate-spin" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-text-primary">
              Generowanie prognozy scenariuszowej w toku...
            </div>
            <p className="text-3xs text-text-muted max-w-sm">
              Analizuję pozycje portfela, harmonogramy premier, sprawozdania finansowe i pozycjonowanie Smart Money.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-3xs font-mono text-success">
            <CheckCircle2 size={13} />
            <span>Prognoza wygenerowana w czasie rzeczywistym</span>
          </div>

          <div className="prose prose-invert max-w-none text-xs leading-relaxed text-text-secondary whitespace-pre-wrap font-sans bg-surface/50 p-4 rounded-xl border border-border-custom/50 max-h-96 overflow-y-auto">
            {reportText}
          </div>
        </div>
      )}
    </div>
  );
};
