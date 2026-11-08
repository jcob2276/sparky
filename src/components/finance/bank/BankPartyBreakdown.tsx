import { useState } from 'react';
import type { BankPartyTotal } from '../../../lib/finance/bankAnalytics';
import { formatCurrency } from '../../../lib/finance/formatMoney';
import Button from '../../ui/Button';
import { Pressable } from '../../ui/ControlPrimitives';
import { FinanceEmpty } from '../financeUi';

interface Props { title: string; rows: BankPartyTotal[]; currency: string; onSelect: (key: string) => void }

export function BankPartyBreakdown({ title, rows, currency, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-t border-border-custom/20 px-4 py-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {rows.length === 0 && <FinanceEmpty>Brak transakcji w tym okresie.</FinanceEmpty>}
      <ul className="mt-2 divide-y divide-border-custom/20">
        {(expanded ? rows : rows.slice(0, 6)).map(row => (
          <li key={row.key}>
            {/* Pressable zamiast Button: Button centruje zawartość i nadpisywał układ wiersza (nazwa po lewej, kwota po prawej). */}
            <Pressable
              className="flex min-h-11 w-full items-start justify-between gap-3 py-3 text-left text-sm text-text-primary hover:bg-surface-2/50"
              onClick={() => onSelect(row.key)}
            >
              <span className="min-w-0 break-words">{row.name}<span className="block text-xs font-normal text-text-muted">{row.count} transakcji</span></span>
              <span className="shrink-0 font-medium tabular-nums">{formatCurrency(row.total, currency)}</span>
            </Pressable>
          </li>
        ))}
      </ul>
      {!expanded && rows.length > 6 && <Button size="sm" variant="ghost" onClick={() => setExpanded(true)}>Pokaż wszystkich ({rows.length})</Button>}
    </div>
  );
}
