import { useState } from 'react';

import { FINANCE_INCOME_LABELS, FINANCE_INCOME_TYPES, type FinanceIncomeType } from '@vanguard/domain';

import Button from '../ui/Button';

import { ToggleChip } from '../ui/ToggleChip';

import { formatPln } from '../../lib/finance/formatMoney';

import type { FinanceIncomeSource } from '../../lib/financeApi';

import { QuickAddForm } from './financeShared';

import { FinanceEmpty, FinanceList, FinanceRow, FinanceSection } from './financeUi';

interface FinanceIncomePanelProps {

  sources: FinanceIncomeSource[];

  onAdd: (input: { name: string; amount_monthly: number; source_type: FinanceIncomeType }) => void;

  onRemove: (id: string) => void;

}

export function FinanceIncomePanel({ sources, onAdd, onRemove }: FinanceIncomePanelProps) {

  const [sourceType, setSourceType] = useState<FinanceIncomeType>('salary');

  const active = sources.filter((s) => s.is_active);

  const total = active.reduce((n, s) => n + s.amount_monthly, 0);

  return (

    <FinanceSection

      title="Dochód"

      subtitle={`Razem ${formatPln(total)}/mies. · UoZ + prowizje setter/closer`}

    >

      <div className="px-4 pt-4">

        <div className="flex flex-wrap gap-1.5">

          {FINANCE_INCOME_TYPES.map((t) => (

            <ToggleChip key={t} active={sourceType === t} onClick={() => setSourceType(t)} size="sm" variant="success">

              {FINANCE_INCOME_LABELS[t]}

            </ToggleChip>

          ))}

        </div>

      </div>

      <QuickAddForm

        fields={[

          { key: 'name', placeholder: 'Źródło' },

          { key: 'amount_monthly', placeholder: 'Miesięcznie', type: 'number' },

        ]}

        onSubmit={(v) => onAdd({ name: v.name, amount_monthly: Number(v.amount_monthly), source_type: sourceType })}

      />

      {active.length === 0 ? (

        <FinanceEmpty>Dodaj UoZ i prowizje — wtedy liczby na Dziś będą trafniejsze.</FinanceEmpty>

      ) : (

        <FinanceList>

          {active.map((s) => (

            <FinanceRow

              key={s.id}

              primary={s.name}

              secondary={FINANCE_INCOME_LABELS[s.source_type as FinanceIncomeType]}

              trailing={<span className="text-success">{formatPln(s.amount_monthly)}</span>}

            >

              <div className="mt-2">

                <Button variant="ghost" size="sm" onClick={() => onRemove(s.id)} className="text-danger">

                  Usuń

                </Button>

              </div>

            </FinanceRow>

          ))}

        </FinanceList>

      )}

    </FinanceSection>

  );

}

