import type { PortfolioForecastModel, ScenarioType } from '../../../lib/investments/portfolioForecastService';
import Button from '../../ui/Button';
import { ScenarioConditionsBox } from './ScenarioConditionsBox';

interface Props {
  model: PortfolioForecastModel;
  selectedScenario: ScenarioType;
  onSelectScenario: (scenario: ScenarioType) => void;
  onAssumptionChange: (scenario: ScenarioType, value: string) => void;
  horizonMonths: number;
}
export function PortfolioScenarioCards({ model, selectedScenario, onSelectScenario, onAssumptionChange, horizonMonths }: Props) {
  return <div className="space-y-4">
    <p className="text-xs text-text-muted">Wpisz własny zwrot aktywów w PLN na {horizonMonths} miesięcy. Pola nie mają domyślnych założeń. Wyniki nie są prognozą ani konsensusem analityków.</p>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {(['bull', 'base', 'bear'] as ScenarioType[]).map((type) => {
        const scenario = model.scenarios[type];
        return <div key={type} className={`rounded-2xl border p-4 space-y-3 ${selectedScenario === type ? 'border-primary bg-primary/5' : 'border-border-custom bg-surface-elevated/40'}`}>
          <Button variant="ghost" size="sm" onClick={() => onSelectScenario(type)}>{scenario.label}</Button>
          <label className="block text-xs text-text-secondary">
            Założony zwrot (%)
            <input type="number" min={-100} step="any" value={scenario.assumedReturnPct ?? ''}
              onChange={(event) => onAssumptionChange(type, event.target.value)}
              className="mt-1 w-full rounded-lg border border-border-custom bg-surface p-2 text-text-primary" />
          </label>
          <div className="font-mono font-bold text-text-primary">{scenario.simulatedPortfolioValuePln == null ? '—' : `${scenario.simulatedPortfolioValuePln.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} PLN`}</div>
          <p className="text-xs text-text-muted">{scenario.simulatedRoiPct == null ? 'Brak założenia' : `${scenario.simulatedRoiPct.toFixed(1)}% zwrotu portfela z gotówką`}</p>
        </div>;
      })}
    </div>
    <ScenarioConditionsBox activeScenario={model.scenarios[selectedScenario]} selectedScenario={selectedScenario} horizonMonths={horizonMonths} />
  </div>;
}
