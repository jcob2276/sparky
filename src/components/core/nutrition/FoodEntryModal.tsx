/**
 * @component FoodEntryModal
 * @role Modal dodawania/edycji wpisu jedzenia (NL parsing, browse, portion, edit).
 * @folders foodEntryModal/ = ekrany (BrowseScreen, EditScreen, NLScreen, PortionScreen,
 *          FoodEntryHeader/Content) | hooks/ = logika (useFoodEntryData/Actions/Edit/Lists/NL/Search,
 *          useQuickCaptureData)
 * @usedBy NutritionCard, FoodQuickCapture
 */
import { useEffect, useRef } from 'react';
import { useSheetKeyboardInset } from './hooks/useSheetKeyboardInset';
import {
  useFoodEntryData,
  type RecentEntry,
} from './hooks/useFoodEntryData';
import FoodEntryHeader from './foodEntryModal/FoodEntryHeader';
import FoodEntryContent from './foodEntryModal/FoodEntryContent';
import Modal from '../../ui/Modal';

export interface FoodEntryModalProps {
  onClose: () => void;
  onSaved?: () => void;
  initialEditEntry?: RecentEntry;
  initialMealType?: string;
  /** Called when a photo change affects what the parent list shows (a lone entry got a photo). */
  onPhotoChanged?: () => void;
}

export default function FoodEntryModal({ onClose, onSaved, initialEditEntry, initialMealType, onPhotoChanged }: FoodEntryModalProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const data = useFoodEntryData({ onClose, onSaved, initialEditEntry, initialMealType, searchInputRef });
  const {
    editingEntry, setEditingEntry, nlMode, setNlMode, selected, setSelected,
    mealType, setMealType, savedFlash, todayTotals, targets,
  } = data;

  useSheetKeyboardInset(sheetRef);

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editingEntry) { setEditingEntry(null); return; }
      if (nlMode) { setNlMode(false); return; }
      if (selected) { setSelected(null); return; }
      onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingEntry, nlMode, selected, onClose, setEditingEntry, setNlMode, setSelected]);

  const screen = editingEntry
    ? 'edit'
    : nlMode
    ? 'nl'
    : selected
    ? 'portion'
    : 'browse';

  const headerTitle =
    screen === 'nl' ? 'Opisz posiłek'
    : screen === 'portion' ? 'Ile zjadłeś?'
    : savedFlash ? '✓ Dodano!' : 'Dodaj posiłek';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      showCloseButton={false}
      padding="p-0"
      overflowY={false}
      size="sm"
      overlayClassName="z-[var(--z-floating)]"
      containerRef={sheetRef}
      className="max-h-[var(--ds-h-94dvh)] sm:max-h-[88vh] flex flex-col overflow-hidden"
    >
      {screen !== 'edit' && (
        <FoodEntryHeader
          headerTitle={headerTitle}
          screen={screen}
          savedFlash={savedFlash}
          mealType={mealType}
          setMealType={setMealType}
          onClose={onClose}
          todayTotals={todayTotals}
          targets={targets}
        />
      )}

      <FoodEntryContent
        {...data}
        onClose={onClose}
        onPhotoChanged={onPhotoChanged}
        canGoBack={!initialEditEntry}
        screen={screen}
        searchInputRef={searchInputRef}
      />
    </Modal>
  );
}
