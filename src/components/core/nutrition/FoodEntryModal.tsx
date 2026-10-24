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

  const {
    userId, activeTab, setActiveTab, favorites, recent, loadingList,
    query, setQuery, searchResults, searching, externalSearching, externalSearched, searchExternal,
    selected, setSelected, grams, setGrams,
    mealType, setMealType, saving, quickAddingId, savedFlash,
    error, setError, scannerOpen, setScannerOpen, scanLookingUp,
    editingEntry, setEditingEntry, editGrams, setEditGrams,
    editMealType, setEditMealType, editSaving, editDeleting,
    todayTotals, targets,
    nlMode, setNlMode, nlText, setNlText, nlParsing, nlItems,
    nlSaving, nlRemovedIdx, setNlRemovedIdx, preview, editPreview,
    openEditEntry, save, quickAddSearchResult, quickAddFavorite,
    quickRepeatEntry, parseNL, saveNLItems, saveEntryEdit, deleteEntry,
    todayStr, yesterdayStr, lookupBarcode,
  } = useFoodEntryData({ onClose, onSaved, initialEditEntry, initialMealType, searchInputRef });

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
        userId={userId}
        onClose={onClose}
        onPhotoChanged={onPhotoChanged}
        canGoBack={!initialEditEntry}
        screen={screen}
        editingEntry={editingEntry}
        setEditingEntry={setEditingEntry}
        editGrams={editGrams}
        setEditGrams={setEditGrams}
        editMealType={editMealType}
        setEditMealType={setEditMealType}
        editPreview={editPreview}
        editSaving={editSaving}
        editDeleting={editDeleting}
        saveEntryEdit={saveEntryEdit}
        deleteEntry={deleteEntry}
        setNlMode={setNlMode}
        setError={setError}
        mealType={mealType}
        setMealType={setMealType}
        nlText={nlText}
        setNlText={setNlText}
        parseNL={parseNL}
        nlParsing={nlParsing}
        error={error}
        nlItems={nlItems}
        nlRemovedIdx={nlRemovedIdx}
        setNlRemovedIdx={setNlRemovedIdx}
        nlSaving={nlSaving}
        saveNLItems={saveNLItems}
        selected={selected}
        setSelected={setSelected}
        grams={grams}
        setGrams={setGrams}
        preview={preview}
        saving={saving}
        savedFlash={savedFlash}
        save={save}
        searchInputRef={searchInputRef}
        query={query}
        setQuery={setQuery}
        searching={searching}
        searchResults={searchResults}
        externalSearching={externalSearching}
        externalSearched={externalSearched}
        searchExternal={searchExternal}
        scannerOpen={scannerOpen}
        setScannerOpen={setScannerOpen}
        scanLookingUp={scanLookingUp}
        lookupBarcode={lookupBarcode}
        quickAddingId={quickAddingId}
        quickAddSearchResult={quickAddSearchResult}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        loadingList={loadingList}
        favorites={favorites}
        quickAddFavorite={quickAddFavorite}
        recent={recent}
        openEditEntry={openEditEntry}
        quickRepeatEntry={quickRepeatEntry}
        todayStr={todayStr}
        yesterdayStr={yesterdayStr}
      />
    </Modal>
  );
}
