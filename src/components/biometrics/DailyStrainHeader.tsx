/**
 * @component DailyStrainHeader
 * @role Nagłówek karty strain (status, refresh, confidence pill).
 * @usedBy DailyStrainCard
 */
import Button from '../ui/Button';
import { RefreshCw } from 'lucide-react';

interface DailyStrainHeaderProps {
  isStale: boolean;
  date: string;
  refreshing: boolean;
  onRefresh: () => void;
  /** True while the model is still learning the user's baseline. */
  preliminary?: boolean;
}

export default function DailyStrainHeader({
  isStale,
  date,
  refreshing,
  onRefresh,
  preliminary = false,
}: DailyStrainHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between relative z-[var(--z-raised)]">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold tracking-normal text-text-muted">Stan dnia</span>
          {preliminary && (
            <span title="Aplikacja dopiero poznaje Twoje typowe wartości, więc ocena jest przybliżona" className="rounded-full bg-surface-solid px-2 py-0.5 text-2xs font-semibold text-text-muted">
              Wstępna ocena
            </span>
          )}
          {isStale && (
            <span className="text-2xs font-bold text-warning tracking-normal">
              (Dane z {date})
            </span>
          )}
        </div>
        <Button onClick={onRefresh} variant="secondary" icon={<RefreshCw size={11} className={refreshing ? 'animate-spin text-primary' : ''} />} className="rounded-xl p-2" title="Sync + przelicz" />
      </div>
    </>
  );
}
