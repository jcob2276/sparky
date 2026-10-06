import { useMemo, useState } from 'react';
import { calculatePortfolioForecast, generateLiveAiPortfolioForecast, type ForecastHorizon, type ScenarioType, type ManualScenarioReturns } from './portfolioForecastService';
import type { JakubPortfolioData } from './jakubPortfolioStorage';
import type { KondzioPortfolioData } from './kondzioPortfolioStorage';
import { notify } from '../notify';

export function usePortfolioForecast(portfolio: JakubPortfolioData | KondzioPortfolioData) {
  const [horizon, setHorizon] = useState<ForecastHorizon>(12);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('base');
  const [assumptionsByHorizon, setAssumptionsByHorizon] = useState<Partial<Record<ForecastHorizon, ManualScenarioReturns>>>({});
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const model = useMemo(() => calculatePortfolioForecast(portfolio, horizon, assumptionsByHorizon[horizon]), [portfolio, horizon, assumptionsByHorizon]);
  const setAssumption = (type: ScenarioType, value: string) => {
    setAssumptionsByHorizon((previous) => ({ ...previous, [horizon]: { ...previous[horizon], [type]: value.trim() ? Number(value) : null } }));
  };
  const handleRunAiForecast = async () => {
    try {
      setIsGeneratingAi(true);
      setAiReport(await generateLiveAiPortfolioForecast(portfolio, horizon));
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Nie udało się wygenerować analizy.', 'error');
    } finally { setIsGeneratingAi(false); }
  };
  return { horizon, setHorizon, selectedScenario, setSelectedScenario, model, setAssumption,
    aiReport, setAiReport, isGeneratingAi, handleRunAiForecast };
}
