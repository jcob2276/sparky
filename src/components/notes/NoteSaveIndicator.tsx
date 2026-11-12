import { useEffect, useState } from 'react';
import type { NoteSaveStatus } from './useNoteDraftAutosave';
import { Pressable } from '../ui/ControlPrimitives';

interface NoteSaveIndicatorProps {
  status: NoteSaveStatus;
  onRetry: () => void;
  className?: string;
}

/** A save that takes this long is worth mentioning; faster ones are invisible, as in Apple Notes. */
const SLOW_SAVE_MS = 2500;

/**
 * Saving is silent while it works: no "unsaved", "saving" or "saved" flicker under the cursor.
 * Only a slow save and a failed save are surfaced, because only those need the user's attention.
 */
export default function NoteSaveIndicator({ status, onRetry, className = '' }: NoteSaveIndicatorProps) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (status !== 'saving') return;
    const timer = window.setTimeout(() => setSlow(true), SLOW_SAVE_MS);
    return () => { window.clearTimeout(timer); setSlow(false); };
  }, [status]);

  if (status === 'error') {
    return (
      <span className={className} role="alert">
        Nie udało się zapisać
        <Pressable variant="ghost" size="sm" onClick={onRetry} className="ml-1 text-4xs">Ponów</Pressable>
      </span>
    );
  }
  if (status === 'saving' && slow) return <span className={className} aria-live="polite">Zapisywanie…</span>;
  return null;
}
