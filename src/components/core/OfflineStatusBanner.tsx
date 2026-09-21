import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { flushOfflineQueue } from '../../lib/offlineQueue';

export function OfflineStatusBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        void flushOfflineQueue();
        timer = setTimeout(() => {
          setShowReconnected(false);
          setWasOffline(false);
        }, 2500);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowReconnected(false);
      if (timer) clearTimeout(timer);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, [wasOffline]);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-status-banner"
      className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[var(--z-toast)] pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
    >
      {!isOnline ? (
        <div className="flex items-center gap-2 rounded-full border border-warning/40 bg-surface-solid/95 px-3.5 py-1.5 shadow-lg shadow-black/10 backdrop-blur-md text-text-primary text-xs font-semibold">
          <WifiOff size={14} className="text-warning shrink-0" />
          <span>Tryb offline — dane zapisywane lokalnie</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-full border border-success/40 bg-surface-solid/95 px-3.5 py-1.5 shadow-lg shadow-black/10 backdrop-blur-md text-text-primary text-xs font-semibold">
          <Wifi size={14} className="text-success shrink-0" />
          <span>Połączenie przywrócone — synchronizuję…</span>
        </div>
      )}
    </div>
  );
}

export default OfflineStatusBanner;
