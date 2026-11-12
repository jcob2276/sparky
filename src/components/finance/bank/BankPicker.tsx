import { useState } from 'react';
import { useAvailableBanks, type BankChoice } from '../../../lib/finance/bankApi';
import Sheet from '../../ui/Sheet';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import { FinanceEmpty } from '../financeUi';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; onPick: (bank: BankChoice) => void }

/** Wybór kolejnego banku z listy agregatora; zgodę i tak zatwierdzasz w aplikacji banku. */
export function BankPicker({ open, onOpenChange, onPick }: Props) {
  const [query, setQuery] = useState('');
  const banks = useAvailableBanks(open);
  const needle = query.trim().toLowerCase();
  const list = (banks.data ?? []).filter(bank => !needle || bank.name.toLowerCase().includes(needle));
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Dodaj bank" side="bottom" compact>
      <div className="space-y-3 p-1">
        <ControlInput aria-label="Szukaj banku" placeholder="Szukaj banku" value={query} onChange={event => setQuery(event.target.value)} />
        {banks.isLoading && <FinanceEmpty>Wczytuję listę banków…</FinanceEmpty>}
        {banks.isError && <p role="alert" className="text-sm text-danger">Nie udało się pobrać listy banków.</p>}
        {!banks.isLoading && !banks.isError && list.length === 0 && <FinanceEmpty>Brak banku pasującego do „{query}”.</FinanceEmpty>}
        <ul className="ios-group max-h-80 divide-y divide-border-custom/20 overflow-y-auto">
          {list.map(bank => (
            <li key={`${bank.country}-${bank.name}`}>
              <Pressable type="button" onClick={() => { onOpenChange(false); onPick(bank); }} className="block w-full px-4 py-3 text-left text-base">{bank.name}</Pressable>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
