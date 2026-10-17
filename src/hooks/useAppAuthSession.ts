import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSession, useStore } from '../store/useStore';

export function useAppAuthSession() {
  const session = useSession();
  const setSession = useStore(state => state.setSession);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let authEventReceived = false;
    // The shell must remain usable if session restoration stalls.
    const safetyTimer = window.setTimeout(() => {
      if (mounted) setLoading(false);
    }, 1200);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      authEventReceived = true;
      setSession(currentSession);
      setLoading(false);
      window.clearTimeout(safetyTimer);
    });
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted || authEventReceived) return;
        if (error) {
          console.warn('[auth] getSession error:', error.message);
          setSession(null);
        } else {
          setSession(data.session);
        }
      })
      .catch((err: unknown) => {
        if (!mounted || authEventReceived) return;
        console.warn('[auth] getSession failed:', err instanceof Error ? err.message : err);
        setSession(null);
      })
      .finally(() => {
        if (!mounted) return;
        window.clearTimeout(safetyTimer);
        setLoading(false);
      });
    return () => {
      mounted = false;
      window.clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [setSession]);

  return { session, loading };
}
