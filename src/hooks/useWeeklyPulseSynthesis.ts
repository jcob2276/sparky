import { useEffect, useRef, useState } from 'react';
import { fetchWeeklyPulseSynthesis } from '../lib/weeklyPulseSynthesis';
import { notify } from '../lib/notify';

export function useWeeklyPulseSynthesis(userId: string) {
  const [result, setResult] = useState<{ userId: string; text: string } | null>(null);
  const [loadingRequest, setLoadingRequest] = useState<{ userId: string; version: number } | null>(null);
  const [shownFor, setShownFor] = useState<string | null>(null);
  const requestVersion = useRef(0);
  useEffect(() => () => { requestVersion.current += 1; }, [userId]);
  const analysis = result?.userId === userId ? result.text : null;
  const loading = loadingRequest?.userId === userId;

  const request = async (prompt: string) => {
    if (!userId || loading) return;
    if (analysis) {
      setShownFor((previous) => previous === userId ? null : userId);
      return;
    }
    const version = ++requestVersion.current;
    setLoadingRequest({ userId, version });
    setShownFor(userId);
    try {
      const text = await fetchWeeklyPulseSynthesis(prompt);
      if (version === requestVersion.current) setResult({ userId, text });
    } catch {
      if (version !== requestVersion.current) return;
      setShownFor((previous) => previous === userId ? null : previous);
      notify('Synteza tygodnia jest teraz niedostępna. Spróbuj ponownie.', 'error');
    } finally {
      setLoadingRequest((previous) => previous?.version === version ? null : previous);
    }
  };
  return { analysis, loading, show: shownFor === userId, request };
}
