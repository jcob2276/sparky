import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

/** Re-check server-side session existence on resume and while the app is open. */
export function useSessionRevocation(session: Session | null) {
  const accessToken = session?.access_token;
  const userId = session?.user.id;
  useEffect(() => {
    if (!accessToken || !userId) return;
    let disposed = false;
    let checking = false;
    const check = async () => {
      if (checking || document.visibilityState === 'hidden') return;
      checking = true;
      try {
        const { error } = await supabase.auth.getUser(accessToken);
        const current = useStore.getState().session;
        if (disposed || current?.access_token !== accessToken || current.user.id !== userId) return;
        if (error && (error.status === 401 || error.code === 'session_not_found'
          || error.name === 'AuthSessionMissingError')) {
          await supabase.auth.signOut({ scope: 'local' });
        }
      } catch {
        // Offline or transient Auth failures are not evidence that a session was revoked.
      } finally {
        checking = false;
      }
    };
    const onResume = () => { void check(); };
    void check();
    const timer = window.setInterval(onResume, 30_000);
    window.addEventListener('focus', onResume);
    document.addEventListener('visibilitychange', onResume);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onResume);
      document.removeEventListener('visibilitychange', onResume);
    };
  }, [accessToken, userId]);
}
