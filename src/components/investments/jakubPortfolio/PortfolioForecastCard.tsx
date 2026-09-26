import { FC, useState, useMemo } from 'react';
import type { JakubPortfolioData } from '../../../lib/investments/jakubPortfolioStorage';
import type { KondzioPortfolioData } from '../../../lib/investments/kondzioPortfolioStorage';
import {
  calculatePortfolioForecast,
  generateLiveAiPortfolioForecast,
  type ForecastHorizon,
  type ScenarioType,
} from '../../../lib/investments/portfolioForecastService';
import { PortfolioScenarioCards } from './PortfolioScenarioCards';
import { PortfolioAnalystTargetsTable } from './PortfolioAnalystTargetsTable';
import { PortfolioAiForecastReport } from './PortfolioAiForecastReport';
import { Sparkles, ChevronRight, BarChart2 } from 'lucide-react';
import Button from '../../ui/Button';
import { notify } from '../../../lib/notify';

interface Props {
  portfolio: JakubPortfolioData | KondzioPortfolioData;
}

export const PortfolioForecastCard: FC<Props> = ({ portfolio }) => {
  const [horizon, setHorizon] = useState<ForecastHorizon>(12);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('base');
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const model = useMemo(
    () => calculatePortfolioForecast(portfolio, horizon),
    [portfolio, horizon]
  );

  const handleRunAiForecast = async () => {
    try {
      setIsGeneratingAi(true);
      notify('Uruchamiam głęboką analizę scenariuszową AI & Jev...', 'info');
      const res = await generateLiveAiPortfolioForecast(portfolio, horizon);
      setAiReport(res);
      notify('Wygenerowano prognozę analityczną AI', 'success');
    } catch (err) {
      console.error('[PortfolioForecastCard] AI forecast error:', err);
      notify('Nie udało się wygenerować raportu AI. Spróbuj ponownie.', 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border-custom bg-surface p-5 sm:p-7 shadow-xs space-y-6 relative overflow-hidden">
      {/* 1. Header with Title & Horizon Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-custom/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
            <BarChart2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-text-primary tracking-tight">
                Prognozy analityków & Scenariusze portfela
              </h3>
              <span className="px-2 py-0.5 rounded-full text-4xs font-mono font-bold bg-primary/10 text-primary border border-primary/20 uppercase">
                Wall Street & GPW
              </span>
            </div>
            <p className="text-3xs text-text-muted mt-0.5">
              Konsensus wycen docelowych, modelowanie asymetrii oraz katalizatory rynkowe
            </p>
          </div>
        </div>

        {/* Horizon Switcher */}
        <div className="flex items-center gap-1 bg-surface-elevated/70 p-1 rounded-xl border border-border-custom self-start sm:self-auto">
          {([6, 12, 24] as ForecastHorizon[]).map((h) => (
            <Button
              key={h}
              size="sm"
              variant={horizon === h ? 'primary' : 'ghost'}
              onClick={() => setHorizon(h)}
              className={`rounded-lg px-2.5 py-1 text-3xs font-mono font-bold ${
                horizon === h ? 'shadow-xs' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {h}M
            </Button>
          ))}
        </div>
      </div>

      {/* 2. Interactive Scenario Cards (Bull / Base / Bear) */}
      <PortfolioScenarioCards
        model={model}
        selectedScenario={selectedScenario}
        onSelectScenario={setSelectedScenario}
        horizonMonths={horizon}
      />

      {/* 3. Analyst Target Prices Table */}
      <PortfolioAnalystTargetsTable
        positions={model.positions}
        horizonMonths={horizon}
      />

      {/* 4. Deep AI & Jev Run Section */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border-custom/50">
        <div className="flex items-center gap-2 text-3xs text-text-muted">
          <Sparkles size={14} className="text-primary shrink-0" />
          <span>
            Chcesz zobaczyć analizę kwartał po kwartale i rekomendację dla wolnych środków?
          </span>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={handleRunAiForecast}
          disabled={isGeneratingAi}
          className="w-full sm:w-auto rounded-xl text-xs gap-2"
        >
          <Sparkles size={14} className={isGeneratingAi ? 'animate-spin' : ''} />
          <span>
            {isGeneratingAi
              ? 'Analizuję portfel w modelu AI...'
              : 'Generuj pełną prognozę AI & Jev'}
          </span>
          <ChevronRight size={13} />
        </Button>
      </div>

      {/* 5. AI Deep Dive Report Container */}
      <PortfolioAiForecastReport
        reportText={aiReport}
        loading={isGeneratingAi}
        onRefresh={handleRunAiForecast}
        onClose={() => setAiReport(null)}
      />
    </div>
  );
};
