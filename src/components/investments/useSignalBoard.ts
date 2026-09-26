import { useEffect, useState } from 'react';
import {
  fetchSignalBoard,
  freshSignalAlerts,
  markSignalAlertsSeen,
  type SignalRow,
  type SignalWindow,
} from '../../lib/investments/signalsApi';

export function useSignalBoard(window: SignalWindow) {
  const [rows, setRows] = useState<SignalRow[]>([]);
  const [alerts, setAlerts] = useState<SignalRow[]>([]);
  const [fetchedWindow, setFetchedWindow] = useState<SignalWindow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSignalBoard(window)
      .then((next) => {
        if (cancelled) return;
        setRows(next);
        setAlerts(freshSignalAlerts(window, next));
        setError(null);
        setFetchedWindow(window);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setRows([]);
        setAlerts([]);
        setError(err instanceof Error ? err.message : 'Nie udało się policzyć zbieżności');
        setFetchedWindow(window);
      });
    return () => {
      cancelled = true;
    };
  }, [window]);

  const dismissAlerts = () => {
    markSignalAlertsSeen(window, rows);
    setAlerts([]);
  };

  return { rows, alerts, loading: fetchedWindow !== window, error, dismissAlerts };
}
