import { useMemo, useState } from 'react';
import { buildCategoryLearner, UNREVIEWED_CATEGORY, type CategorySuggestion } from '@vanguard/domain';
import type { BankCategoryAssignment, BankTransaction } from '../../../lib/finance/bankApi';
import { bankCategoryLabel } from '../../../lib/finance/bankSpending';
import { formatCurrency } from '../../../lib/finance/formatMoney';
import Button from '../../ui/Button';
import { Pressable } from '../../ui/ControlPrimitives';
import { FinanceList, FinanceRow, FinanceSection } from '../financeUi';

interface Props {
  transactions: BankTransaction[];
  onAssign: (input: BankCategoryAssignment) => Promise<boolean>;
  onEdit: (tx: BankTransaction) => void;
}

type Suggested = { tx: BankTransaction; suggestion: CategorySuggestion };

/** Podpowiedzi uczą się z transakcji, które już masz skategoryzowane; nic nie zmienia się bez Twojego zatwierdzenia. */
export function BankSuggestions({ transactions, onAssign, onEdit }: Props) {
  const [busy, setBusy] = useState(false);
  const items = useMemo<Suggested[]>(() => {
    const learner = buildCategoryLearner(transactions);
    const out: Suggested[] = [];
    for (const tx of transactions) {
      if (tx.category && tx.category !== UNREVIEWED_CATEGORY) continue;
      const suggestion = learner.suggest(tx);
      if (suggestion) out.push({ tx, suggestion });
    }
    return out;
  }, [transactions]);
  if (!items.length) return null;

  const apply = async (list: Suggested[]) => {
    setBusy(true);
    try {
      for (const { tx, suggestion } of list) await onAssign({ transactionId: tx.id, category: suggestion.category, remember: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FinanceSection title="Podpowiedzi kategorii" footer="Na podstawie kategorii, które sam wybrałeś. Dotknij wiersza, żeby wybrać inną.">
      <FinanceList>
        {items.slice(0, 5).map(({ tx, suggestion }) => (
          <div key={tx.id} className="flex items-center gap-2 pr-3">
            <Pressable type="button" onClick={() => onEdit(tx)} aria-label={`Zmień kategorię: ${tx.counterparty_name || 'transakcja'}`} className="block min-w-0 flex-1 text-left hover:bg-text-primary/[0.04]">
              <FinanceRow primary={<span className="break-words">{tx.counterparty_name || tx.remittance || 'Transakcja'}</span>}
                secondary={`${bankCategoryLabel(suggestion.category)} · ${formatCurrency(tx.amount, tx.currency)}`} />
            </Pressable>
            <Button size="sm" variant="tonal" disabled={busy} onClick={() => void apply([{ tx, suggestion }])}>Zatwierdź</Button>
          </div>
        ))}
      </FinanceList>
      <div className="p-3">
        <Button variant="outline" className="w-full" loading={busy} onClick={() => void apply(items)}>
          Zastosuj wszystkie podpowiedzi ({items.length})
        </Button>
      </div>
    </FinanceSection>
  );
}
