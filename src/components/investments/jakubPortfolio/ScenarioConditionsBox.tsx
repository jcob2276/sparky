import { FC } from 'react';
import type { ScenarioBreakdown, ScenarioType } from '../../../lib/investments/portfolioForecastService';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  activeScenario: ScenarioBreakdown;
  selectedScenario: ScenarioType;
  horizonMonths: number;
}

export const ScenarioConditionsBox: FC<Props> = ({
  activeScenario,
  selectedScenario,
  horizonMonths,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-surface-elevated/50 border border-border-custom/80 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              selectedScenario === 'bull'
                ? 'bg-success'
                : selectedScenario === 'base'
                ? 'bg-primary'
                : 'bg-danger'
            }`}
          />
          <h4 className="text-xs sm:text-sm font-bold text-text-primary">
            Co musi się wydarzyć ({activeScenario.label}):
          </h4>
        </div>
        <span className="text-4xs font-mono text-text-muted uppercase">
          Horyzont {horizonMonths}M
        </span>
      </div>

      <p className="text-3xs text-text-secondary leading-relaxed font-sans">
        {activeScenario.headline}
      </p>

      <ul className="space-y-2 pt-1 border-t border-border-custom/50">
        {activeScenario.coreConditions.map((cond, i) => (
          <li
            key={i}
            className="text-xs font-sans text-text-secondary flex items-start gap-2"
          >
            <CheckCircle2
              size={14}
              className={`shrink-0 mt-0.5 ${
                selectedScenario === 'bull'
                  ? 'text-success'
                  : selectedScenario === 'base'
                  ? 'text-primary'
                  : 'text-danger'
              }`}
            />
            <span>{cond}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
