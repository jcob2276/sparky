import { normalizeBankText } from './bankCategories.ts';

/** Minimalny kształt transakcji potrzebny do uczenia; bez zależności od typów aplikacji. */
export interface LearnableTransaction {
  id: string;
  amount: number;
  counterparty_name: string | null;
  remittance?: string | null;
  category: string | null;
  category_source?: string;
}

export interface CategorySuggestion {
  category: string;
  /** Udział najczęstszej kategorii wśród podobnych transakcji (0..1). */
  confidence: number;
  /** Ile znanych transakcji uzasadnia podpowiedź. */
  support: number;
}

export const UNREVIEWED_CATEGORY = 'do_sprawdzenia';

const STOP_TOKENS = new Set([
  'SP', 'ZOO', 'SA', 'SPOLKA', 'PLATNOSC', 'KARTA', 'KARTA:', 'TRANSAKCJA', 'PRZELEW', 'POLSKA', 'POLAND', 'PL',
  'WARSZAWA', 'KRAKOW', 'WROCLAW', 'POZNAN', 'GDANSK', 'LODZ', 'SKLEP', 'ONLINE', 'WWW', 'COM', 'EU', 'OPLATA',
  'ZA', 'DLA', 'BANK', 'PEKAO', 'MBANK', 'PKO', 'ING', 'SANTANDER', 'ALIOR', 'MILLENNIUM', 'BNP', 'PARIBAS', 'AGRICOLE', 'KONTO', 'REVOLUT', 'PAYPAL', 'PAYU', 'BLIK', 'PRZELEWY24', 'DOTPAY', 'DUBLIN', 'KROSNO', 'RZESZOW', 'LONDON', 'LUXEMBOURG', 'NR', 'UL', 'OD', 'DO', 'THE', 'AND',
]);

/** Znaczące tokeny nazwy kontrahenta: bez liczb, krótkich słów i ogólników. */
export function merchantTokens(counterparty: string | null): string[] {
  const seen = new Set<string>();
  for (const raw of normalizeBankText(counterparty).split(' ')) {
    const token = raw.replace(/^[-.*]+|[-.*]+$/g, '');
    if (token.length < 3 || token === 'S.A' || /\d/.test(token) || STOP_TOKENS.has(token)) continue;
    seen.add(token);
  }
  return [...seen];
}

const direction = (amount: number) => (amount < 0 ? 'debit' : 'credit');

export interface CategoryLearner {
  suggest: (tx: LearnableTransaction) => CategorySuggestion | null;
}

/**
 * Uczy się z już skategoryzowanych transakcji: każdy token kontrahenta zapamiętuje, w jakiej kategorii
 * najczęściej występował (osobno dla wydatków i wpływów). Podpowiedź wymaga co najmniej dwóch zgodnych
 * transakcji i przewagi jednej kategorii, żeby nie zgadywać na jednej obserwacji.
 */
export function buildCategoryLearner(history: readonly LearnableTransaction[], minSupport = 2, minConfidence = 0.8): CategoryLearner {
  const stats = new Map<string, Map<string, number>>();
  for (const tx of history) {
    // Uczymy się tylko z wyborów użytkownika, nie z własnych zgadnięć słów kluczowych.
    if (!tx.category || tx.category === UNREVIEWED_CATEGORY) continue;
    if (tx.category_source !== 'manual' && tx.category_source !== 'rule') continue;
    for (const token of merchantTokens(tx.counterparty_name)) {
      const key = `${direction(tx.amount)}:${token}`;
      const bucket = stats.get(key) ?? new Map<string, number>();
      bucket.set(tx.category, (bucket.get(tx.category) ?? 0) + 1);
      stats.set(key, bucket);
    }
  }
  return {
    suggest(tx) {
      const votes = new Map<string, number>();
      let total = 0;
      for (const token of merchantTokens(tx.counterparty_name)) {
        const bucket = stats.get(`${direction(tx.amount)}:${token}`);
        if (!bucket) continue;
        // Token mówiący tylko o jednej kategorii waży więcej niż token rozproszony.
        const sum = [...bucket.values()].reduce((a, b) => a + b, 0);
        for (const [category, count] of bucket) {
          const weight = (count / sum) * count;
          votes.set(category, (votes.get(category) ?? 0) + weight);
        }
        total += sum;
      }
      if (!votes.size) return null;
      const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]);
      const [category, top] = ranked[0];
      const all = ranked.reduce((acc, [, v]) => acc + v, 0);
      const confidence = top / all;
      const support = Math.round(top);
      if (confidence < minConfidence || top < minSupport) return null;
      return { category, confidence, support: Math.max(support, Math.min(total, minSupport)) };
    },
  };
}
