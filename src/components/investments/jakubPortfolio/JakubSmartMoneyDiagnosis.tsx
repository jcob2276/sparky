import { FC } from 'react';
import type { JakubPortfolioData } from '../../../lib/investments/jakubPortfolioStorage';
import { Zap, ShieldCheck, AlertTriangle, PieChart } from 'lucide-react';

interface Props {
  portfolio: JakubPortfolioData;
}

export const JakubSmartMoneyDiagnosis: FC<Props> = ({ portfolio }) => {
  const totalAssets = portfolio.totalValuePln;
  const cashPct = totalAssets > 0 ? (portfolio.freeCashPln / totalAssets) * 100 : 0;

  const positions = portfolio.positions;
  const spaceVal = positions.find((p) => p.ticker === 'JEDI')?.currentValue ?? 0;
  const mrvlVal = positions.find((p) => p.ticker === 'MRVL')?.currentValue ?? 0;
  const cdrVal = positions.find((p) => p.ticker === 'CDR')?.currentValue ?? 0;
  const spVal = positions.find((p) => p.ticker === 'SXR8')?.currentValue ?? 0;

  const spacePct = totalAssets > 0 ? (spaceVal / totalAssets) * 100 : 0;
  const mrvlPct = totalAssets > 0 ? (mrvlVal / totalAssets) * 100 : 0;
  const cdrPct = totalAssets > 0 ? (cdrVal / totalAssets) * 100 : 0;
  const spPct = totalAssets > 0 ? (spVal / totalAssets) * 100 : 0;

  return (
    <div className="rounded-3xl border border-border-custom bg-surface p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border-custom/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <Zap size={16} className="fill-primary" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-text-primary tracking-tight">
              Diagnoza Smart Money & Jev System-1
            </h3>
            <p className="text-3xs text-text-muted">
              Ocena asymetrii, dywersyfikacji i ekspozycji na kapitał instytucjonalny
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-4xs font-mono font-bold uppercase bg-primary/10 text-primary border border-primary/20">
          Analiza IKE
        </span>
      </div>

      {/* Allocation Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-3xs font-mono text-text-muted">
          <span>Struktura alokacji aktywów</span>
          <span>Gotówka: {cashPct.toFixed(1)}%</span>
        </div>

        <div className="h-3 rounded-full bg-surface-elevated overflow-hidden flex p-0.5 border border-border-custom gap-0.5">
          {/* Space ETF */}
          <div
            style={{ width: `${spacePct}%` }}
            className="h-full rounded-sm bg-primary"
            title={`VanEck Space Innovators (${spacePct.toFixed(1)}%)`}
          />
          {/* Marvell */}
          <div
            style={{ width: `${mrvlPct}%` }}
            className="h-full rounded-sm bg-success"
            title={`Marvell Tech (${mrvlPct.toFixed(1)}%)`}
          />
          {/* Cash */}
          <div
            style={{ width: `${cashPct}%` }}
            className="h-full rounded-sm bg-warning"
            title={`Wolne środki (${cashPct.toFixed(1)}%)`}
          />
          {/* CDR */}
          <div
            style={{ width: `${cdrPct}%` }}
            className="h-full rounded-sm bg-danger"
            title={`CD Projekt RED (${cdrPct.toFixed(1)}%)`}
          />
          {/* S&P 500 */}
          <div
            style={{ width: `${spPct}%` }}
            className="h-full rounded-sm bg-info"
            title={`Core S&P 500 (${spPct.toFixed(1)}%)`}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-3xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-text-secondary">Space ETF (66.7%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-text-secondary">Marvell Tech (20.9%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-text-secondary">Gotówka (8.6%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-danger" />
            <span className="text-text-secondary">CD Projekt (3.5%)</span>
          </div>
        </div>
      </div>

      {/* Grid of Key Takeaways */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Insight 1: Koncentracja */}
        <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-border-custom/60 space-y-1.5">
          <div className="flex items-center gap-2 text-warning text-xs font-bold font-mono">
            <AlertTriangle size={14} className="shrink-0" />
            <span>Ryzyko koncentracji w Space ETF</span>
          </div>
          <p className="text-3xs text-text-secondary leading-relaxed">
            Aż <strong>66.7% portfela</strong> stanowi jeden sektorowy fundusz (VanEck Space),
            odpowiadający za <strong>-1 732 PLN</strong> drawdownu. Smart Money zaleca doważanie
            szerokiego rynku (np. S&P 500 lub MSCI World) przed powiększaniem niszowych ETF-ów.
          </p>
        </div>

        {/* Insight 2: Asymetria Marvell */}
        <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-border-custom/60 space-y-1.5">
          <div className="flex items-center gap-2 text-success text-xs font-bold font-mono">
            <ShieldCheck size={14} className="shrink-0" />
            <span>Lider asymetrii: Marvell ($MRVL)</span>
          </div>
          <p className="text-3xs text-text-secondary leading-relaxed">
            Pozycja przynosi <strong>+17.79% (+222.37 PLN)</strong> zysku. W raportach SEC 13F fundusze
            hedgingowe aktywnie akumulują producentów chipów ASIC pod infrastrukturę centrów danych AI.
          </p>
        </div>
      </div>

      {/* Footer tip */}
      <div className="p-3 rounded-2xl bg-surface-2/60 border border-border-custom flex items-center gap-2 text-3xs font-mono text-text-muted">
        <PieChart size={14} className="text-primary shrink-0" />
        <span>
          Do wykorzystania w IKE pozostało <strong>23 999 PLN</strong> limitu bez podatku Belki.
        </span>
      </div>
    </div>
  );
};
