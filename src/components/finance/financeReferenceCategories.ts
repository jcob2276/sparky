import { BANK_CATEGORY_LABELS } from '@vanguard/domain';
import type { FinanceTransaction } from '../../lib/financeApi';
import { movement } from './financeReferencePeriods';

const UNCLASSIFIED_DETAIL = 'Bez podkategorii';

const GROUPS = {
  Jedzenie: ['Zakupy spożywcze', 'Jedzenie na mieście', 'Dostawa jedzenia'],
  Transport: ['Transport i paliwo', 'Komunikacja miejska', 'Taksówki', 'Parking', 'Serwis samochodu'],
  Dom: ['Dom i remont', 'Czynsz', 'Rachunki', 'Telefon i internet'],
  Zdrowie: ['Apteka', 'Lekarze i badania', 'Uroda'],
  Rozrywka: ['Subskrypcje', 'Kultura i wydarzenia', 'Gry'],
  Rozwój: ['Kursy', 'Książki'],
  Hobby: ['Sport', 'Sprzęt i materiały'],
  Praca: ['Sprzęt', 'Usługi', 'Podatki i składki'],
  Prezenty: ['Prezenty dla bliskich', 'Darowizny'],
  Podróże: ['Noclegi', 'Bilety', 'Wydatki w podróży'],
  Zakupy: ['Ubrania', 'Elektronika', 'Zakupy online'],
  'Opłaty i przelewy': ['Opłaty i mandaty', 'Przelewy do osób'],
  Inne: [],
  'Do sprawdzenia': [],
} as const;

type Group = keyof typeof GROUPS;
const normalized = (value: string) => value.trim().normalize('NFC').toLocaleLowerCase('pl');
const byLabel = new Map<string, { group: Group; detail: string }>();
for (const [group, details] of Object.entries(GROUPS) as [Group, readonly string[]][]) {
  byLabel.set(normalized(group), { group, detail: UNCLASSIFIED_DETAIL });
  for (const detail of details) byLabel.set(normalized(detail), { group, detail });
}

export function financeCategory(value: string) {
  const label = value.trim();
  const key = normalized(label);
  const bankLabel = Object.prototype.hasOwnProperty.call(BANK_CATEGORY_LABELS, key)
    ? BANK_CATEGORY_LABELS[key as keyof typeof BANK_CATEGORY_LABELS] : label;
  return byLabel.get(key) ?? byLabel.get(normalized(bankLabel)) ?? {
    group: label ? 'Inne' : 'Do sprawdzenia',
    detail: label || UNCLASSIFIED_DETAIL,
  };
}

export function financeTransactionCategory(item: FinanceTransaction) {
  const kind = movement(item);
  if (kind === 'transfer') return { group: 'Oszczędności', detail: item.note ?? UNCLASSIFIED_DETAIL };
  if (kind === 'expense') return financeCategory(item.category);
  return { group: kind === 'refund' ? 'Zwroty' : 'Wpływy', detail: item.category.trim() || UNCLASSIFIED_DETAIL };
}

export function summarizeFinanceCategories(transactions: readonly FinanceTransaction[]) {
  const groups = new Map<string, { cents: number; details: Map<string, number> }>();
  for (const item of transactions) {
    if (movement(item) !== 'expense') continue;
    const cents = Math.round(Math.abs(item.amount) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) continue;
    const { group, detail } = financeCategory(item.category);
    const entry = groups.get(group) ?? { cents: 0, details: new Map<string, number>() };
    entry.cents += cents;
    entry.details.set(detail, (entry.details.get(detail) ?? 0) + cents);
    groups.set(group, entry);
  }
  return [...groups].map(([group, entry]) => ({
    group,
    amount: entry.cents / 100,
    details: [...entry.details].map(([detail, cents]) => ({ detail, amount: cents / 100 }))
      .sort((a, b) => b.amount - a.amount || a.detail.localeCompare(b.detail, 'pl')),
  })).sort((a, b) => b.amount - a.amount || a.group.localeCompare(b.group, 'pl'));
}
