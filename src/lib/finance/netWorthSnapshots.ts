import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { getTodayWarsaw } from '../date';
import { invalidateFinance } from './financeUpdateMutations';

export interface NetWorthSnapshotInput {
  netWorth: number;
  liquid: number;
  investments: number;
}

/** Zapisuje bieżący miesiąc jako punkt wykresu majątku w czasie (jeden wiersz na miesiąc). */
async function saveNetWorthSnapshot(userId: string, input: NetWorthSnapshotInput): Promise<void> {
  const month = `${getTodayWarsaw().slice(0, 7)}-01`;
  const { error } = await supabase.from('finance_snapshots').upsert({
    user_id: userId,
    snapshot_month: month,
    net_worth: Math.round(input.netWorth * 100) / 100,
    liquid_cash: Math.round(input.liquid * 100) / 100,
    investments: Math.round(input.investments * 100) / 100,
  }, { onConflict: 'user_id,snapshot_month' });
  if (error) throw new Error(error.message);
}

/** Po załadowaniu wyceny odświeża migawkę miesiąca, gdy majątek zmienił się o co najmniej 1 zł. */
export function useNetWorthSnapshotSync(
  userId: string | undefined,
  input: NetWorthSnapshotInput | null,
  stored: number | null,
) {
  const qc = useQueryClient();
  const lastSaved = useRef<number | null>(null);

  useEffect(() => {
    if (!userId || !input || !Number.isFinite(input.netWorth)) return;
    const rounded = Math.round(input.netWorth);
    if (lastSaved.current === rounded || (stored != null && Math.round(stored) === rounded)) return;
    lastSaved.current = rounded;
    void saveNetWorthSnapshot(userId, input)
      .then(() => invalidateFinance(qc, userId))
      .catch(() => { lastSaved.current = null; });
  }, [userId, input, stored, qc]);
}
