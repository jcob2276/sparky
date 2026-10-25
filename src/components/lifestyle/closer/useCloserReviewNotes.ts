import { useCallback, useEffect } from 'react';
import { usePersistentDraft } from '../../../hooks/usePersistentDraft';

export function useCloserReviewNotes(userId: string, callId: string, saved: string) {
  const key = 'sparky:closer-review-draft:' + userId + ':' + callId;
  const [stored, setStored] = usePersistentDraft<{ text: string } | null>(key, null);
  const draft = stored && typeof stored.text === 'string' ? stored.text : saved;
  const dirty = draft !== saved;
  const discard = useCallback(() => {
    setStored(null);
    try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
  }, [key, setStored]);

  useEffect(() => {
    if (stored && !dirty) discard();
  }, [stored, dirty, discard]);

  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  return { draft, setDraft: (text: string) => setStored({ text }), dirty, discard };
}

