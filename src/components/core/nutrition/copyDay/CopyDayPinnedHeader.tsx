import { X } from 'lucide-react';
import { Pressable } from '../../../ui/ControlPrimitives';
import { useHaptics } from '../../../../hooks/useHaptics';
import type { MealTypeId } from '../../../../lib/health/foodLogging';
import { mealLabelForType } from '../../../../lib/health/mealComposerUtils';
import type { RecentDaySummary } from '../../../../lib/health/composerTodayMealsApi';
import DayDatePills from './DayDatePills';
import CopyDestinationSelector from './CopyDestinationSelector';
import CopyDaySummaryBanner from './CopyDaySummaryBanner';

interface CopyDayPinnedHeaderProps {
  onClose: () => void;
  availableDates: string[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
  targetDate: string;
  yesterday: string;
  summariesRecord: Record<string, RecentDaySummary>;
  summariesLoading?: boolean;
  hasEntries: boolean;
  totalEntriesCount: number;
  targetMealType: MealTypeId | null;
  onSelectDestination: (dest: MealTypeId | null) => void;
  selectedKcal: number;
  selectedProtein: number;
  selectedCount: number;
  isFetching: boolean;
  copying: boolean;
  onToggleSelectAll: () => void;
  onCopySelected: () => void;
}

export default function CopyDayPinnedHeader({
  onClose,
  availableDates,
  selectedDate,
  onSelectDate,
  targetDate,
  yesterday,
  summariesRecord,
  summariesLoading,
  hasEntries,
  totalEntriesCount,
  targetMealType,
  onSelectDestination,
  selectedKcal,
  selectedProtein,
  selectedCount,
  isFetching,
  copying,
  onToggleSelectAll,
  onCopySelected,
}: CopyDayPinnedHeaderProps) {
  const haptics = useHaptics();

  return (
    <>
      {/* Mobile iOS Drag Handle */}
      <div className="mx-auto mt-2.5 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-border-custom/80 sm:hidden" />

      {/* Pinned Modal Header */}
      <div className="flex items-center justify-between border-b border-border-custom/50 px-5 py-3 bg-surface-solid/30">
        <div>
          <h3 className="text-base font-black text-text-primary tracking-tight">Kopiuj z innego dnia</h3>
          <p className="text-2xs font-medium text-text-muted">Wybierz dzień, zaznacz produkty i przenieś do dzisiaj</p>
        </div>
        <Pressable
          type="button"
          onClick={() => {
            haptics.light();
            onClose();
          }}
          className="touch-manipulation h-8 w-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-solid/80 ui-interactive active:scale-90"
          title="Zamknij"
        >
          <X size={18} />
        </Pressable>
      </div>

      {/* Pinned Date Selector & Destination Bar */}
      <div className="border-b border-border-custom/50 px-5 py-3 space-y-3 bg-surface/90 backdrop-blur-xs">
        <DayDatePills
          dates={availableDates}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          targetDate={targetDate}
          yesterday={yesterday}
          summaries={summariesRecord}
          isLoading={summariesLoading}
        />

        {hasEntries && (
          <>
            <CopyDestinationSelector
              selectedDestination={targetMealType}
              onSelectDestination={onSelectDestination}
              disabled={copying}
            />

            <CopyDaySummaryBanner
              selectedKcal={selectedKcal}
              selectedProtein={selectedProtein}
              selectedCount={selectedCount}
              totalCount={totalEntriesCount}
              isFetching={isFetching}
              copying={copying}
              targetDestinationLabel={targetMealType ? mealLabelForType(targetMealType) : null}
              onToggleSelectAll={onToggleSelectAll}
              onCopySelected={onCopySelected}
            />
          </>
        )}
      </div>
    </>
  );
}
