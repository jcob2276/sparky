import { useState } from 'react';
import { BANK_CATEGORY_LABELS, bankOwnIbanKey, customBankCategoryLabel, isBankCategory } from '@vanguard/domain';
import type { BankCategoryAssignment, BankTransaction } from '../../../lib/finance/bankApi';
import { formatCurrency } from '../../../lib/finance/formatMoney';
import Button from '../../ui/Button';
import Sheet from '../../ui/Sheet';
import { ControlInput, ControlSelect } from '../../ui/ControlPrimitives';

interface Props {
  transaction: BankTransaction;
  pending: boolean;
  customCategories?: string[];
  onClose: () => void;
  onSave: (input: BankCategoryAssignment) => Promise<boolean>;
}

export function BankCategoryEditor({ transaction: tx, pending, onClose, onSave, customCategories }: Props) {
  const [category, setCategory] = useState<string>(isBankCategory(tx.category) ? tx.category : 'do_sprawdzenia');
  const [newName, setNewName] = useState('');
  const selection = category === '__new' ? `custom:${newName.trim().normalize('NFC')}` : category;
  const available = [...new Set([...(customCategories ?? []), ...(customBankCategoryLabel(tx.category) ? [tx.category!] : [])])];
  const [scope, setScope] = useState('single');
  const hasIban = !!bankOwnIbanKey(tx.counterparty_iban);
  const ownAccountRule = category === 'przelewy_wlasne' && hasIban;
  const canRemember = ownAccountRule || !!tx.counterparty_name;
  const save = async (automatic = false, forgetRule = false) => {
    if (await onSave({ transactionId: tx.id, category: automatic ? null : selection, remember: !automatic && canRemember && scope === 'remember', ...(forgetRule ? { forgetRule: true } : {}) })) onClose();
  };
  return (
    <Sheet open onOpenChange={open => { if (!open && !pending) onClose(); }} title="Kategoria transakcji" side="bottom" compact>
      <div className="space-y-4">
        <div>
          <p className="break-words text-base font-medium">{tx.counterparty_name || tx.remittance || 'Transakcja'}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(tx.amount, tx.currency)}</p>
          {hasIban && <p className="mt-1 break-all text-xs text-text-muted">{tx.counterparty_iban}</p>}
        </div>
        <label className="block space-y-2 text-sm">Kategoria
          <ControlSelect aria-label="Nowa kategoria" value={category} disabled={pending} onChange={e => setCategory(e.target.value)} className="min-h-11 w-full rounded-lg bg-surface-2 px-3">
            {Object.entries(BANK_CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            {available.map((key) => <option key={key} value={key}>{customBankCategoryLabel(key)}</option>)}
            {customCategories && <option value="__new">+ Dodaj kategorię</option>}
          </ControlSelect>
        </label>
        {category === '__new' && <label className="block space-y-2 text-sm">Nazwa własnej kategorii
          <ControlInput value={newName} maxLength={60} disabled={pending} onChange={(event) => setNewName(event.target.value)}
            className="min-h-11 w-full rounded-lg bg-surface-2 px-3" />
        </label>}
        <label className="block space-y-2 text-sm">Zakres zmiany
          <ControlSelect aria-label="Zakres zmiany" value={canRemember ? scope : 'single'} disabled={pending || !canRemember} onChange={e => setScope(e.target.value)} className="min-h-11 w-full rounded-lg bg-surface-2 px-3">
            <option value="single">Tylko ta transakcja</option>
            <option value="remember">{ownAccountRule ? 'Zapamiętaj ten rachunek jako własny' : 'Zapamiętaj dla tego kontrahenta'}</option>
          </ControlSelect>
        </label>
        <p className="text-sm text-text-muted">{ownAccountRule
          ? 'Potwierdzasz, że ten IBAN należy do Ciebie. Przelewy z tego rachunku i na ten rachunek będą przelewami własnymi. Poprzednie ręczne korekty zostają zachowane.'
          : 'Zapamiętana reguła obejmie ten sam kierunek płatności. Poprzednie ręczne korekty zostają zachowane. Dla bramek płatniczych wybierz pojedynczą transakcję.'}</p>
        <Button className="w-full" loading={pending} disabled={!isBankCategory(selection)} onClick={() => void save()}>Zapisz kategorię</Button>
        <Button className="w-full" variant="ghost" disabled={pending} onClick={() => void save(true)}>Przywróć automatyczne przypisanie</Button>
        <p className="text-xs text-text-muted">Automatyczne przypisanie uwzględnia także zapamiętane własne rachunki i reguły kontrahenta.</p>
        {(tx.counterparty_name || hasIban) && <Button className="w-full" variant="ghost" disabled={pending} onClick={() => void save(true, true)}>Usuń zapamiętaną regułę i przelicz automatycznie</Button>}
        <p className="text-xs text-text-muted">{hasIban
          ? 'Jeśli ten IBAN jest zapamiętany jako własny, usunięcie reguły przeliczy oba kierunki. W innym przypadku usunie regułę kontrahenta dla tego kierunku. Pozostałe ręczne korekty zostają.'
          : 'Usunięcie reguły przeliczy automatyczne kategorie tego kontrahenta w tym samym kierunku. Pozostałe ręczne korekty zostają.'}</p>
      </div>
    </Sheet>
  );
}
