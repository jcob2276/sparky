import { lazy, Suspense, useMemo, useState, startTransition } from 'react';
import { Card } from '../../ui/Card';
import BarcodeScanner from './BarcodeScanner';
import MealScanOverlay from './MealScanOverlay';
import MealComposerCustomProduct from './MealComposerCustomProduct';
import MealComposerDraft from './MealComposerDraft';
import MealComposerLoggedItems from './MealComposerLoggedItems';
import MealComposerQuick from './MealComposerQuick';
import MealSupplementsWidget from './MealSupplementsWidget';
import { ComposerHeader, ComposerInput, ComposerProgress, ComposerSearch } from './MealComposerChrome';
import type { RecentEntry } from './hooks/foodEntryUtils';
import { useMealComposer } from './hooks/useMealComposer';
import { useMealPhotoUrls } from './hooks/useMealPhotoUrls';
import { useWeekBalance } from './hooks/useWeekBalance';
import { useDayReview } from './hooks/useDayReview';
import { computeDayNutrientCoverage } from '../../../lib/health/nutrientCoverage';
import { computeDayEnergyRange } from '../../../lib/health/nutritionAudit';
import { useSession } from '../../../store/useStore';

const FoodEntryModal = lazy(() => import('./FoodEntryModal'));
const CopyDayModal = lazy(() => import('./CopyDayModal'));

function sumDayMacros(entries: Array<{ carbs: number | null; fat: number | null }>) {
  return {
    carbs: Math.round(entries.reduce((sum, e) => sum + (e.carbs ?? 0), 0)),
    fat: Math.round(entries.reduce((sum, e) => sum + (e.fat ?? 0), 0) * 10) / 10,
  };
}

export default function MealComposer({ onSaved, refreshSignal = 0 }: { onSaved?: () => void; refreshSignal?: number }) {
  const session = useSession();
  const c = useMealComposer(onSaved, refreshSignal);
  const photoUrls = useMealPhotoUrls(session?.user.id, c.allTodayEntries);
  const [editEntry, setEditEntry] = useState<RecentEntry | null>(null);
  const [copyDayOpen, setCopyDayOpen] = useState(false);
  const nutrients = useMemo(() => computeDayNutrientCoverage(c.allTodayEntries), [c.allTodayEntries]);
  const energy = useMemo(() => computeDayEnergyRange(c.allTodayEntries), [c.allTodayEntries]);
  const macros = useMemo(() => sumDayMacros(c.allTodayEntries), [c.allTodayEntries]);

  const dayReview = useDayReview(session?.user.id, c.logDate);
  const week = useWeekBalance(session?.user.id, c.logDate, c.totals.calories, c.totals.targetKcal);

  if (!session) return null;

  return (
    <>
      <Card className="space-y-2 border-border-custom/80 bg-surface p-4 shadow-sm">
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
          week={week}
          dayReview={dayReview}
          nutrients={nutrients}
          energy={energy}
          macros={macros}
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

        {c.scanFile && <MealScanOverlay file={c.scanFile} />}

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
            onOpenCopyDay={() => startTransition(() => setCopyDayOpen(true))}
          />
        )}

        {c.userId && <MealSupplementsWidget userId={c.userId} date={c.logDate} />}

        {c.allTodayEntries.length > 0 && (
          <MealComposerLoggedItems
            entries={c.allTodayEntries}
            photoUrls={Object.keys(photoUrls).length ? photoUrls : undefined}
            onEditEntry={setEditEntry}
            onDeleteEntry={c.deleteEntry}
            isPastDay={c.isPastDay}
            onCopyEntireDay={c.copyEntireDayToToday}
            onCopyMeal={c.copyMealToToday}
            copying={c.saving}
            dateLabel={
              c.logDate === c.today
                ? 'Zjedzone'
                : c.logDate === c.yesterday
                ? 'Zjedzone · wczoraj'
                : `Zjedzone · ${c.logDate}`
            }
          />
        )}

        {c.error && <p role="alert" className="text-xs text-danger text-center font-medium">{c.error}</p>}

      </Card>

      {editEntry && (
        <Suspense fallback={null}>
          <FoodEntryModal
            initialEditEntry={editEntry}
            onClose={() => setEditEntry(null)}
            onPhotoChanged={() => void c.refreshAfterSave()}
            onSaved={() => { setEditEntry(null); void c.refreshAfterSave(); onSaved?.(); }}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
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
      </Suspense>
    </>
  );
}
