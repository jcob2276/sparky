import type { BankTransaction } from './bankApi';
import { bankCategoryLabel } from './bankSpending';

const BOM = String.fromCharCode(0xfeff);
const cell = (value: string | number | null | undefined): string => {
  const text = value == null ? '' : String(value);
  // Prefiks apostrofu blokuje wykonanie formuł, gdy ktoś otworzy plik w arkuszu.
  const safe = /^[=+@-]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text;
  return /[",;\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** CSV (średnik, przecinek dziesiętny nie jest potrzebny: kwoty zapisujemy z kropką) z widocznej historii. */
export function bankTransactionsToCsv(rows: readonly BankTransaction[]): string {
  const header = ['Data', 'Kontrahent', 'Opis', 'Kategoria', 'Kwota', 'Waluta'];
  const lines = rows.map(tx => [tx.booking_date, tx.counterparty_name, tx.remittance, bankCategoryLabel(tx.category), tx.amount.toFixed(2), tx.currency].map(cell).join(','));
  return `${BOM}${[header.join(','), ...lines].join('\r\n')}`;
}
