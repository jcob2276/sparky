import { ChevronLeft, Plus, Settings } from 'lucide-react';
import type { FinanceTransaction } from '../../lib/financeApi';
import { useBankActions } from '../../lib/finance/bankApi';
import { formatPln } from '../../lib/finance/formatMoney';
import { notify } from '../../lib/notify';
import { Pressable } from '../ui/ControlPrimitives';
import Sheet from '../ui/Sheet';
import type { FinanceTabKey } from './FinanceTabContent';

export function FinanceReferenceHeader({ userId, tab, bankConnected, onBack, onAccounts, onQuickEntry }: {
  userId: string;
  tab: FinanceTabKey;
  bankConnected: boolean;
  onBack: () => void;
  onAccounts: () => void;
  onQuickEntry: () => void;
}) {
  const { sync } = useBankActions(userId);
  return (
    <header className="finance-reference-header">
      <div className="finance-reference-toolbar">
        <Pressable type="button" aria-label={tab === 'accounts' || tab === 'tools' ? 'Wróć do finansów' : 'Wróć do Sparky'} onClick={onBack}>
          <ChevronLeft size={21} aria-hidden="true" />
        </Pressable>
        <strong>finanse</strong>
        <div className="finance-reference-actions">
          {bankConnected && <Pressable type="button" className="finance-reference-sync" disabled={sync.isPending}
            onClick={() => sync.mutate(undefined, {
              onSuccess: (message) => notify(message, 'success'),
              onError: (error) => notify(error.message, 'error'),
            })}>
            {sync.isPending ? 'Zgrywam…' : 'Zgraj'}
          </Pressable>}
          <Pressable type="button" onClick={onQuickEntry} aria-label="Szybki wpis"><Plus size={20} aria-hidden="true" /></Pressable>
          <Pressable type="button" onClick={onAccounts} aria-label="Ustawienia finansów" aria-current={tab === 'accounts' ? 'page' : undefined}>
            <Settings size={19} aria-hidden="true" />
          </Pressable>
        </div>
      </div>
    </header>
  );
}

export function FinanceReferenceTransactionSheet({ selected, onClose }: {
  selected: FinanceTransaction | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={selected !== null} onOpenChange={(open) => { if (!open) onClose(); }} title="Szczegóły transakcji" side="bottom" compact>
      {selected && <div className="space-y-3 p-5">
        <p className="text-lg font-semibold">{selected.note || selected.category}</p>
        <dl className="finance-reference-breakdown">
          <div><dt>Kwota</dt><dd>{formatPln(Math.abs(selected.amount), 2)}</dd></div>
          <div><dt>Data</dt><dd>{selected.transaction_date}</dd></div>
          <div><dt>Kategoria</dt><dd>{selected.category}</dd></div>
          <div><dt>Źródło</dt><dd>{selected.source === 'bank' ? 'Bank' : 'Wpis ręczny'}</dd></div>
        </dl>
      </div>}
    </Sheet>
  );
}
