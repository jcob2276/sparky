import { FC } from 'react';
import type {
  PortfolioForecastModel,
  ScenarioType,
} from '../../../lib/investments/portfolioForecastService';
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import Button from '../../ui/Button';
import { ScenarioConditionsBox } from './ScenarioConditionsBox';

interface Props {
  model: PortfolioForecastModel;
  selectedScenario: ScenarioType;
  onSelectScenario: (scenario: ScenarioType) => void;
  horizonMonths: number;
}

export const PortfolioScenarioCards: FC<Props> = ({
  model,
  selectedScenario,
  onSelectScenario,
  horizonMonths,
}) => {
  const activeScenario = model.scenarios[selectedScenario];

  return (
    <div className="space-y-4">
      {/* 3 Scenario Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Bull */}
        <Button
          variant="ghost"
          onClick={() => onSelectScenario('bull')}
          className={`w-full text-left p-4 rounded-2xl border transition-all h-auto block ${
            selectedScenario === 'bull'
              ? 'bg-success/10 border-success/50 ring-1 ring-success/30 shadow-xs'
              : 'bg-surface-elevated/40 border-border-custom hover:border-success/30'
          }`}
        >
          <div className="flex items-center justify-between text-3xs font-mono font-bold uppercase mb-1">
            <span className="text-success flex items-center gap-1">
              <TrendingUp size={13} />
              <span>Hossa (Bull)</span>
            </span>
            <span className="px-1.5 py-0.2 rounded-md bg-success/15 text-success border border-success/30">
              {model.scenarios.bull.probabilityPct}% szans
            </span>
          </div>

          <div className="text-lg sm:text-xl font-black font-mono text-text-primary mt-2">
            {model.scenarios.bull.simulatedPortfolioValuePln.toLocaleString('pl-PL', {
              maximumFractionDigits: 0,
            })}{' '}
            <span className="text-xs font-normal text-text-muted">PLN</span>
          </div>

          <div className="text-xs font-mono font-bold text-success mt-1">
            +{model.scenarios.bull.simulatedRoiPct.toFixed(1)}% (+
            {model.scenarios.bull.simulatedProfitPln.toLocaleString('pl-PL', {
              maximumFractionDigits: 0,
            })}{' '}
            PLN)
          </div>
        </Button>

        {/* Base */}
        <Button
          variant="ghost"
          onClick={() => onSelectScenario('base')}
          className={`w-full text-left p-4 rounded-2xl border transition-all h-auto block ${
            selectedScenario === 'base'
              ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/30 shadow-xs'
              : 'bg-surface-elevated/40 border-border-custom hover:border-primary/30'
          }`}
        >
          <div className="flex items-center justify-between text-3xs font-mono font-bold uppercase mb-1">
            <span className="text-primary flex items-center gap-1">
              <BarChart2 size={13} />
              <span>Bazowy (Konsensus)</span>
            </span>
            <span className="px-1.5 py-0.2 rounded-md bg-primary/15 text-primary border border-primary/30">
              {model.scenarios.base.probabilityPct}% szans
            </span>
          </div>

          <div className="text-lg sm:text-xl font-black font-mono text-text-primary mt-2">
            {model.scenarios.base.simulatedPortfolioValuePln.toLocaleString('pl-PL', {
              maximumFractionDigits: 0,
            })}{' '}
            <span className="text-xs font-normal text-text-muted">PLN</span>
          </div>

          <div className="text-xs font-mono font-bold text-primary mt-1">
            +{model.scenarios.base.simulatedRoiPct.toFixed(1)}% (+
            {model.scenarios.base.simulatedProfitPln.toLocaleString('pl-PL', {
              maximumFractionDigits: 0,
            })}{' '}
            PLN)
          </div>
        </Button>

        {/* Bear */}
        <Button
          variant="ghost"
          onClick={() => onSelectScenario('bear')}
          className={`w-full text-left p-4 rounded-2xl border transition-all h-auto block ${
            selectedScenario === 'bear'
              ? 'bg-danger/10 border-danger/50 ring-1 ring-danger/30 shadow-xs'
              : 'bg-surface-elevated/40 border-border-custom hover:border-danger/30'
          }`}
        >
          <div className="flex items-center justify-between text-3xs font-mono font-bold uppercase mb-1">
            <span className="text-danger flex items-center gap-1">
              <TrendingDown size={13} />
              <span>Bessa (Bear)</span>
            </span>
            <span className="px-1.5 py-0.2 rounded-md bg-danger/15 text-danger border border-danger/30">
              {model.scenarios.bear.probabilityPct}% szans
            </span>
          </div>

          <div className="text-lg sm:text-xl font-black font-mono text-text-primary mt-2">
            {model.scenarios.bear.simulatedPortfolioValuePln.toLocaleString('pl-PL', {
              maximumFractionDigits: 0,
            })}{' '}
            <span className="text-xs font-normal text-text-muted">PLN</span>
          </div>

          <div className="text-xs font-mono font-bold text-danger mt-1">
            {model.scenarios.bear.simulatedRoiPct.toFixed(1)}% (
            {model.scenarios.bear.simulatedProfitPln.toLocaleString('pl-PL', {
              maximumFractionDigits: 0,
            })}{' '}
            PLN)
          </div>
        </Button>
      </div>

      {/* Conditions Box */}
      <ScenarioConditionsBox
        activeScenario={activeScenario}
        selectedScenario={selectedScenario}
        horizonMonths={horizonMonths}
      />
    </div>
  );
};
