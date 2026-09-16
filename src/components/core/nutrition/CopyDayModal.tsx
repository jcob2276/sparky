import Modal from '../../ui/Modal';
import CopyDayPinnedHeader from './copyDay/CopyDayPinnedHeader';
import CopyDayMealsList from './copyDay/CopyDayMealsList';
import { useCopyDayModalLogic } from './copyDay/useCopyDayModalLogic';

interface CopyDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  targetDate: string;
  onCopied: () => void;
}

export default function CopyDayModal({
  isOpen,
  onClose,
  userId,
  targetDate,
  onCopied,
}: CopyDayModalProps) {
  const c = useCopyDayModalLogic({
    isOpen,
    onClose,
    userId,
    targetDate,
    onCopied,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      padding="p-0"
      overflowY={false}
      size="xl"
      className="max-h-[92vh] sm:max-h-[85vh] w-full flex flex-col overflow-hidden rounded-t-[28px] sm:rounded-3xl border border-border-custom bg-surface shadow-2xl"
    >
      <CopyDayPinnedHeader
        onClose={onClose}
        availableDates={c.availableDates}
        selectedDate={c.selectedDate}
        onSelectDate={c.handleSelectDate}
        targetDate={targetDate}
        yesterday={c.yesterday}
        summariesRecord={c.summariesRecord}
        summariesLoading={c.summariesLoading}
        hasEntries={c.entries.length > 0}
        totalEntriesCount={c.entries.length}
        targetMealType={c.targetMealType}
        onSelectDestination={c.setTargetMealType}
        selectedKcal={c.selectedKcal}
        selectedProtein={c.selectedProtein}
        selectedCount={c.selectedCount}
        isFetching={c.entriesFetching}
        copying={c.copying}
        onToggleSelectAll={c.handleToggleSelectAll}
        onCopySelected={c.handleCopySelected}
      />

      {/* Scrollable Meals Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-3.5 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-custom/50">
        <CopyDayMealsList
          isLoading={c.entriesLoading}
          hasEntries={c.entries.length > 0}
          groupedEntries={c.groupedEntries}
          selectedIds={c.selectedItemIds}
          onToggleItem={c.handleToggleItem}
          onToggleMeal={c.handleToggleMeal}
          copying={c.copying}
          onCopyMeal={c.handleCopyMeal}
        />
      </div>
    </Modal>
  );
}

