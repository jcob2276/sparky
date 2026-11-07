import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BANK_CATEGORY_LABELS, bankCounterpartyKey, categorizeBankTransaction, type BankCategory } from '@vanguard/domain';
import { HttpError } from '../../_shared/http.ts';
import { safeExecute } from '../../_shared/supabase.ts';

async function context(db: SupabaseClient, userId: string) {
  const accounts: Array<{ iban: string | null; name: string | null }> = await safeExecute(
    db.from('bank_accounts').select('iban, name').eq('user_id', userId),
  );
  const rules: Array<{ counterparty_key: string; category: string }> = await safeExecute(db.from('bank_category_rules')
    .select('counterparty_key, category').eq('user_id', userId));
  return {
    ibans: accounts.flatMap(a => a.iban ? [a.iban] : []),
    names: accounts.flatMap(a => a.name ? [a.name] : []),
    rules: new Map(rules.filter(r => Object.hasOwn(BANK_CATEGORY_LABELS, r.category)).map(r => [r.counterparty_key, r.category as BankCategory])),
  };
}

export async function categorizeUser(db: SupabaseClient, userId: string, all: boolean): Promise<{ updated: number }> {
  const ctx = await context(db, userId);
  const groups = new Map<BankCategory, string[]>();
  for (let from = 0; ; from += 500) {
    let q = db.from('bank_transactions').select('id, counterparty_name, counterparty_iban, remittance, direction')
      .eq('user_id', userId).neq('category_source', 'manual').order('id').range(from, from + 499);
    if (!all) q = q.is('category', null);
    const rows: Array<{ id: string; counterparty_name: string | null; counterparty_iban: string | null; remittance: string | null; direction: 'debit' | 'credit' }> = await safeExecute(q);
    for (const r of rows) {
      const category = categorizeBankTransaction({ counterparty: r.counterparty_name, counterpartyIban: r.counterparty_iban,
        remittance: r.remittance, direction: r.direction }, ctx.rules, ctx.ibans, ctx.names);
      const ids = groups.get(category) ?? [];
      ids.push(r.id);
      groups.set(category, ids);
    }
    if (rows.length < 500) break;
  }
  let updated = 0;
  for (const [category, ids] of groups) {
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      await safeExecute(db.from('bank_transactions').update({ category, category_source: 'rule' })
        .eq('user_id', userId).neq('category_source', 'manual').in('id', chunk));
      updated += chunk.length;
    }
  }
  return { updated };
}

export async function recategorize(db: SupabaseClient, userId: string | null): Promise<Record<string, unknown>> {
  if (!userId) throw new HttpError(400, 'Brak userId');
  return await categorizeUser(db, userId, true);
}

export async function setCategory(db: SupabaseClient, userId: string | null,
  input: { transactionId?: unknown; category?: unknown; remember?: unknown; forgetRule?: unknown }): Promise<Record<string, unknown>> {
  if (!userId) throw new HttpError(400, 'Brak userId');
  const automatic = input.category === null;
  if (!automatic && (typeof input.category !== 'string' || !Object.hasOwn(BANK_CATEGORY_LABELS, input.category))) throw new HttpError(400, 'Nieznana kategoria');
  const id = typeof input.transactionId === 'string' ? input.transactionId : '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, 'Niepoprawna transakcja');
  const tx = await safeExecute(db.from('bank_transactions').select('id, counterparty_name, counterparty_iban, remittance, direction')
    .eq('id', id).eq('user_id', userId).maybeSingle());
  if (!tx) throw new HttpError(404, 'Nie znaleziono transakcji');
  const key = bankCounterpartyKey(tx.counterparty_name, tx.direction);
  const ctx = automatic ? await context(db, userId) : null;
  if (ctx && input.forgetRule === true) {
    ctx.rules.delete(key);
    if (tx.direction === 'debit') ctx.rules.delete(bankCounterpartyKey(tx.counterparty_name));
  }
  const category = ctx ? categorizeBankTransaction({ counterparty: tx.counterparty_name, counterpartyIban: tx.counterparty_iban,
    remittance: tx.remittance, direction: tx.direction }, ctx.rules, ctx.ibans, ctx.names) : input.category as string;
  if (automatic && input.forgetRule === true && key) {
    const related: string[] = [];
    for (let from = 0; ; from += 500) {
      const page: Array<{ id: string; counterparty_name: string | null; direction: 'debit' | 'credit' }> = await safeExecute(
        db.from('bank_transactions').select('id, counterparty_name, direction').eq('user_id', userId)
          .eq('direction', tx.direction).order('id').range(from, from + 499));
      related.push(...page.filter(r => bankCounterpartyKey(r.counterparty_name, r.direction) === key).map(r => r.id));
      if (page.length < 500) break;
    }
    await safeExecute(db.rpc('forget_bank_category_rule', { p_user_id: userId, p_key: key, p_transaction_id: id, p_category: category, p_related_ids: related }));
    await categorizeUser(db, userId, false);
    return { remembered: false };
  }
  await safeExecute(db.rpc('set_bank_transaction_category', { p_user_id: userId, p_transaction_id: id, p_category: category,
    p_source: automatic ? 'rule' : 'manual', p_remember: !automatic && input.remember === true && !!key,
    p_counterparty_key: key || null }));
  if (!automatic && input.remember === true && key) await recategorize(db, userId);
  return { remembered: !automatic && input.remember === true && !!key };
}
