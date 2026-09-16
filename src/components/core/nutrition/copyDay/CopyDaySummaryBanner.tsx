import { CheckSquare, Sparkles, Square } from 'lucide-react';
import { Pressable } from '../../../ui/ControlPrimitives';
import Spinner from '../../../ui/Spinner';

interface CopyDaySummaryBannerProps {
  selectedKcal: number;
  selectedProtein: number;
  selectedCount: number;
  totalCount: number;
  isFetching: boolean;
  copying: boolean;
  targetDestinationLabel?: string | null;
  onToggleSelectAll: () => void;
  onCopySelected: () => void;
}

export default function CopyDaySummaryBanner({
  selectedKcal,
  selectedProtein,
  selectedCount,
  totalCount,
  isFetching,
  copying,
  targetDestinationLabel,
  onToggleSelectAll,
  onCopySelected,
}: CopyDaySummaryBannerProps) {
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const noneSelected = selectedCount === 0;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-2xl border border-primary/25 bg-primary/[0.06] p-3 shadow-2xs">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-2xs font-black uppercase tracking-wider text-primary">
            {targetDestinationLabel ? `Cel: ${targetDestinationLabel}` : 'Zaznaczone pozycje'}
          </span>
          {isFetching && <Spinner size="sm" />}
        </div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="font-display text-base font-black text-text-primary leading-tight">
            {selectedKcal} kcal
          </span>
          <span className="text-xs font-bold text-text-muted">
            · <span className="text-primary font-black">{selectedProtein} g B</span>
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-2xs text-text-muted">
          <span>
            {selectedCount} z {totalCount} poz.
          </span>
          <span>·</span>
          <Pressable
            type="button"
            onClick={onToggleSelectAll}
            className="touch-manipulation flex items-center gap-1 font-bold text-primary hover:underline cursor-pointer"
          >
            {allSelected ? (
              <>
                <Square size={11} />
                <span>Odznacz wszystkie</span>
              </>
            ) : (
              <>
                <CheckSquare size={11} />
                <span>Zaznacz wszystkie</span>
              </>
            )}
          </Pressable>
        </div>
      </div>

      <Pressable
        type="button"
        variant="primary"
        onClick={onCopySelected}
        disabled={copying || noneSelected}
        className="touch-manipulation shrink-0 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black shadow-sm active:scale-95 disabled:opacity-40"
      >
        {copying ? (
          <>
            <Spinner size="sm" className="!border-on-accent/30 !border-t-on-accent" />
            <span>Kopiowanie…</span>
          </>
        ) : (
          <>
            <Sparkles size={14} />
            <span>
              {noneSelected
                ? 'Wybierz pozycje'
                : allSelected
                ? `Skopiuj cały dzień (${selectedKcal} kcal)`
                : `Skopiuj wybrane (${selectedCount})`}
            </span>
          </>
        )}
      </Pressable>
    </div>
  );
}

