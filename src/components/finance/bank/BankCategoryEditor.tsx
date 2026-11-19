import { Check } from 'lucide-react';
import { useState } from 'react';
import { BANK_CATEGORY_LABELS, bankOwnIbanKey, customBankCategoryLabel, isBankCategory, normalizeBankText } from '@vanguard/domain';
import type { BankCategoryAssignment, BankTransaction } from '../../../lib/finance/bankApi';
import { formatCurrency } from '../../../lib/finance/formatMoney';
import Button from '../../ui/Button';
import Sheet from '../../ui/Sheet';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';

interface Props {
  transaction: BankTransaction;
  pending: boolean;
  customCategories?: string[];
  onClose: () => void;
  onSave: (input: BankCategoryAssignment) => Promise<boolean>;
}

const DEBIT_SHORTCUTS = ['zakupy_spozywcze', 'jedzenie_na_miescie', 'transport', 'zakupy', 'oplaty', 'subskrypcje'];
const CREDIT_SHORTCUTS = ['wynagrodzenie', 'zwrot', 'przelewy_wlasne', 'dzialalnosc', 'wplyw', 'dochody_kapitalowe'];

export function BankCategoryEditor({ transaction: tx, pending, onClose, onSave, customCategories }: Props) {
  const [category, setCategory] = useState<string>(isBankCategory(tx.category) ? tx.category : 'do_sprawdzenia');
  const [newName, setNewName] = useState('');
  const selection = category === '__new' ? `custom:${newName.trim().normalize('NFC')}` : category;
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [remember, setRemember] = useState(false);
  const options = new Map<string, string>(Object.entries(BANK_CATEGORY_LABELS));
  for (const key of [...(customCategories ?? []), tx.category]) {
    const label = customBankCategoryLabel(key);
    if (key && label) options.set(key, label);
  }
  const shortcuts = tx.amount > 0 ? CREDIT_SHORTCUTS : DEBIT_SHORTCUTS;
  const featured = category !== '__new' && !shortcuts.includes(category)
    ? [category, ...shortcuts.slice(0, 5)] : shortcuts;
  const visible = expanded
    ? [...options.keys()].filter((key) => normalizeBankText(options.get(key) ?? '').includes(normalizeBankText(query)))
    : featured;
  const hasIban = !!bankOwnIbanKey(tx.counterparty_iban);
  const ownAccountRule = category === 'przelewy_wlasne' && hasIban;
  const canRemember = ownAccountRule || !!tx.counterparty_name;
  const save = async (automatic = false, forgetRule = false) => {
    if (await onSave({ transactionId: tx.id, category: automatic ? null : selection, remember: !automatic && canRemember && remember, ...(forgetRule ? { forgetRule: true } : {}) })) onClose();
  };
  return (
    <Sheet open onOpenChange={open => { if (!open && !pending) onClose(); }} title="Kategoria transakcji" side="bottom" compact>
      <div className="space-y-4">
        <div>
          <p className="break-words text-base font-medium">{tx.counterparty_name || tx.remittance || 'Transakcja'}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(tx.amount, tx.currency)}</p>
          {hasIban && <p className="mt-1 break-all text-xs text-text-muted">{tx.counterparty_iban}</p>}
        </div>
        <div className="space-y-2" role="group" aria-label="Wybierz kategorię">
          {expanded && <ControlInput type="search" aria-label="Szukaj kategorii" placeholder="Szukaj kategorii" value={query}
            onChange={(event) => setQuery(event.target.value)} className="min-h-11 w-full rounded-lg bg-surface-2 px-3" />}
          <div className="grid grid-cols-2 gap-2">
            {visible.map((key) => <Pressable key={key} type="button" aria-pressed={category === key} disabled={pending}
              onClick={() => { setCategory(key); setExpanded(false); setQuery(''); }}
              className="flex min-h-11 items-center justify-between gap-1 rounded-xl border border-border-custom/30 bg-surface-2 px-2 py-2 text-left text-sm font-medium aria-pressed:border-primary aria-pressed:text-primary">
              <span className="min-w-0 break-words">{options.get(key)}</span>
              {category === key && <Check size={16} className="shrink-0" aria-hidden="true" />}
            </Pressable>)}
          </div>
          {expanded && !visible.length && <p className="text-sm text-text-muted">Brak pasujących kategorii.</p>}
          <div className="flex flex-wrap gap-x-4">
            <Pressable type="button" className="finance-reference-link min-h-11" aria-expanded={expanded}
              onClick={() => { setExpanded(!expanded); setQuery(''); }}>{expanded ? 'Pokaż mniej' : 'Wszystkie kategorie'}</Pressable>
            {customCategories && <Pressable type="button" className="finance-reference-link min-h-11" aria-expanded={category === '__new'}
              disabled={pending} onClick={() => { setExpanded(false); setQuery(''); setCategory('__new'); }}>Dodaj własną</Pressable>}
          </div>
        </div>
        {category === '__new' && <label className="block space-y-2 text-sm">Nazwa własnej kategorii
          <ControlInput value={newName} maxLength={60} disabled={pending} onChange={(event) => setNewName(event.target.value)}
            className="min-h-11 w-full rounded-lg bg-surface-2 px-3" />
        </label>}
        {canRemember && <label className="flex min-h-11 items-center gap-2 text-sm">
          <ControlInput type="checkbox" checked={remember} disabled={pending} onChange={(event) => setRemember(event.target.checked)} />
          {ownAccountRule ? 'Zapamiętaj ten rachunek jako własny' : 'Zapamiętaj dla tego kontrahenta'}
        </label>}
        <Button className="w-full" loading={pending} disabled={!isBankCategory(selection)} onClick={() => void save()}>Zapisz kategorię</Button>
        <details className="text-sm">
          <summary className="cursor-pointer py-2 text-text-muted">Opcje automatycznej kategoryzacji</summary>
          <Button className="w-full" variant="ghost" disabled={pending} onClick={() => void save(true)}>Przywróć automatyczne przypisanie</Button>
          {(tx.counterparty_name || hasIban) && <Button className="w-full" variant="ghost" disabled={pending}
            onClick={() => void save(true, true)}>Usuń zapamiętaną regułę i przelicz automatycznie</Button>}
        </details>
      </div>
    </Sheet>
  );
}
