import { useState } from 'react';
import { Card } from '../../ui/Card';
import BarcodeScanner from './BarcodeScanner';
import MealComposerCustomProduct from './MealComposerCustomProduct';
import MealComposerDraft from './MealComposerDraft';
import MealComposerLoggedItems from './MealComposerLoggedItems';
import MealComposerQuick from './MealComposerQuick';
import { ComposerHeader, ComposerInput, ComposerProgress, ComposerSearch } from './MealComposerChrome';
import NutritionDayReview from './NutritionDayReview';
import FoodEntryModal from './FoodEntryModal';
import CopyDayModal from './CopyDayModal';
import type { RecentEntry } from './hooks/foodEntryUtils';
import { useMealComposer } from './hooks/useMealComposer';
import { useSession } from '../../../store/useStore';

export default function MealComposer({
  onSaved,
  refreshSignal = 0,
}: {
  onSaved?: () => void;
  refreshSignal?: number;
}) {
  const session = useSession();
  const c = useMealComposer(onSaved, refreshSignal);
  const [editEntry, setEditEntry] = useState<RecentEntry | null>(null);
  const [copyDayOpen, setCopyDayOpen] = useState(false);

  if (!session) return null;

  return (
    <>
      <Card className="space-y-4 border-border-custom/80 bg-surface p-5 shadow-sm">
        <ComposerHeader
          logDate={c.logDate}
          setLogDate={c.setLogDate}
          mealType={c.mealType}
          setMealType={c.setMealType}
          today={c.today}
          yesterday={c.yesterday}
          mealTypes={c.MEAL_TYPES}
        />

        <ComposerProgress
          totals={c.totals}
          qualityPending={c.qualityPending}
          macros={{
            carbs: Math.round(c.allTodayEntries.reduce((s, e) => s + (e.carbs ?? 0), 0)),
            fat: Math.round(c.allTodayEntries.reduce((s, e) => s + (e.fat ?? 0), 0) * 10) / 10,
          }}
        />

        <ComposerInput
          text={c.text}
          setText={c.setText}
          parsing={c.parsing}
          saving={c.saving}
          scanningPhoto={c.scanningPhoto}
          searchOpen={c.searchOpen}
          onParse={() => void c.parseText()}
          onPhotoPick={(file) => void c.scanPhoto(file)}
          onToggleSearch={() => c.setSearchOpen((open) => !open)}
          onOpenScanner={() => c.search.setScannerOpen(true)}
          photoInputRef={c.photoInputRef}
        />

        {c.search.scannerOpen && (
          <BarcodeScanner
            onDetected={(code) => void c.search.lookupBarcode(code)}
            onClose={() => c.search.setScannerOpen(false)}
            loading={c.search.scanLookingUp}
          />
        )}

        {c.searchOpen && !c.search.scannerOpen && (
          <div className="space-y-2">
            <ComposerSearch
              query={c.search.query}
              setQuery={c.search.setQuery}
              searching={c.search.searching}
              results={c.search.searchResults}
              externalSearching={c.search.externalSearching}
              externalSearched={c.search.externalSearched}
              searchExternal={c.search.searchExternal}
              onPick={(food) => c.addFoodToDraft(food, food.defaultGrams ?? 100)}
            />
            {c.userId && (
              <MealComposerCustomProduct
                userId={c.userId}
                saving={c.saving}
                onCreated={(food) => c.addFoodToDraft(food, food.defaultGrams ?? 100)}
              />
            )}
          </div>
        )}

        {c.draftItems?.length ? (
          <MealComposerDraft
            items={c.draftItems}
            saving={c.saving}
            rememberedByName={c.rememberedByName}
            loggedTime={c.loggedTime}
            setLoggedTime={c.setLoggedTime}
            memoryName={c.memoryName}
            setMemoryName={c.setMemoryName}
            onChange={c.setDraftItems}
            onRemove={(id) => c.setDraftItems((items) => items?.filter((item) => item.id !== id) ?? null)}
            onSave={(rememberIds, name) => c.saveFromDraft(rememberIds, name)}
          />
        ) : null}

        {!c.draftItems?.length && (
          <MealComposerQuick
            chips={c.quickChips}
            saving={c.saving}
            onChip={c.handleQuickChip}
            onOpenCopyDay={() => setCopyDayOpen(true)}
            yesterdayMealSuggestion={c.yesterdayMealSuggestion}
            onRepeatYesterdayMeal={c.repeatYesterdayMeal}
          />
        )}

        {c.allTodayEntries.length > 0 && (
          <MealComposerLoggedItems
            entries={c.allTodayEntries}
            onEditEntry={setEditEntry}
            onDeleteEntry={(id) => void c.deleteEntry(id)}
            isPastDay={c.isPastDay}
            onCopyEntireDay={c.copyEntireDayToToday}
            onCopyMeal={c.copyMealToToday}
            copying={c.saving}
            dateLabel={
              c.logDate === c.today
                ? 'Zjedzone dziś'
                : c.logDate === c.yesterday
                ? 'Zjedzone wczoraj'
                : `Zjedzone (${c.logDate})`
            }
          />
        )}

        {c.error && <p role="alert" className="text-xs text-danger text-center font-medium">{c.error}</p>}

        <NutritionDayReview userId={session.user.id} date={c.logDate} hasEntries={c.hasEntries} />
      </Card>

      {editEntry && (
        <FoodEntryModal
          initialEditEntry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={() => {
            setEditEntry(null);
            void c.refreshAfterSave();
            onSaved?.();
          }}
        />
      )}

      {copyDayOpen && c.userId && (
        <CopyDayModal
          isOpen={copyDayOpen}
          onClose={() => setCopyDayOpen(false)}
          userId={c.userId}
          targetDate={c.today}
          onCopied={() => {
            void c.refreshAfterSave();
            onSaved?.();
          }}
        />
      )}
    </>
  );
}
