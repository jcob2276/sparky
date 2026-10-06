import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSignalBoard, freshSignalAlerts, markSignalAlertsSeen,
  type SignalRow, type SignalWindow } from '../../lib/investments/signalsApi';
const EMPTY: SignalRow[] = [];

export function useSignalBoard(window: SignalWindow) {
  const query = useQuery({ queryKey: ['investments', 'signals', window],
    queryFn: async () => {
      const rows = await fetchSignalBoard(window);
      return { rows, alerts: freshSignalAlerts(window, rows) };
    }, staleTime: 60000,
    refetchInterval: 5 * 60000, retry: 1 });
  const rows = query.data?.rows ?? EMPTY;
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const readKey = `${window}:${query.dataUpdatedAt}`;
  const alerts = dismissedKey === readKey ? EMPTY : query.data?.alerts ?? EMPTY;
  return { rows, alerts, loading: query.isLoading,
    error: query.error ? query.error instanceof Error ? query.error.message : 'Nie udało się odczytać ujawnień' : null,
    dismissAlerts: () => { markSignalAlertsSeen(window, rows); setDismissedKey(readKey); } };
}
