import { lazy, Suspense, useState, startTransition } from 'react';
import { ChefHat } from 'lucide-react';
import Button from '../../ui/Button';
import Sheet from '../../ui/Sheet';
import { Card } from '../../ui/Card';
import BarcodeScanner from './BarcodeScanner';
import MealScanOverlay from './MealScanOverlay';
import MealComposerCustomProduct from './MealComposerCustomProduct';
import MealComposerDraft from './MealComposerDraft';
import MealComposerLoggedItems from './MealComposerLoggedItems';
import MealComposerQuick from './MealComposerQuick';
import MealSupplementsWidget from './MealSupplementsWidget';
import MealMacroBar from './MealMacroBar';
import { ComposerHeader, ComposerInput, ComposerProgress, ComposerSearch } from './MealComposerChrome';
import type { RecentEntry } from './hooks/foodEntryUtils';
import type { useMealComposer } from './hooks/useMealComposer';
import type { DayNutrientCoverage } from '../../../lib/health/nutrientCoverage';
import type { DayEnergyRange } from '../../../lib/health/nutritionAudit';
import type { WeekBalance } from '../../../lib/health/weekBalance';

const FoodEntryModal = lazy(() => import('./FoodEntryModal'));
const MealPlanner = lazy(() => import('../../biometrics/nutrition/MealPlannerContainer').then((module) => ({ default: module.MealPlannerContainer })));
const CopyDayModal = lazy(() => import('./CopyDayModal'));

interface Props {
  c: ReturnType<typeof useMealComposer>;
  photoUrls: Record<string, string>;
  nutrients: DayNutrientCoverage;
  energy: DayEnergyRange | null;
  macros: { carbs: number | null; fat: number | null };
  week: WeekBalance | null;
  onSaved?: () => void;
}

interface ModalsProps {
  c: ReturnType<typeof useMealComposer>;
  macros: { carbs: number | null; fat: number | null };
  plannerOpen: boolean;
  onClosePlanner: () => void;
  editEntry: RecentEntry | null;
  onCloseEdit: () => void;
  copyDayOpen: boolean;
  onCloseCopyDay: () => void;
  onSaved?: () => void;
}

function MealComposerModals({ c, macros, plannerOpen, onClosePlanner, editEntry, onCloseEdit, copyDayOpen, onCloseCopyDay, onSaved }: ModalsProps) {
  return (
    <>
      {plannerOpen && c.userId && (
        <Sheet
          open={plannerOpen}
          onOpenChange={(open) => { if (!open) onClosePlanner(); }}
          title="Posiłki na dziś"
          side="bottom"
          compact
          handleDragOnly
        >
          <div className="pb-2">
            <Suspense fallback={<p role="status" className="py-8 text-center text-xs text-text-muted">Wczytuję planer…</p>}>
              <MealPlanner key={c.mealType} userId={c.userId} date={c.today} targetKcal={c.totals.targetKcal}
                targetProtein={c.totals.targetProtein} mealFocus={c.mealType} logged={{
                  calories: c.totals.calories, protein: c.totals.protein, carbs: macros.carbs, fat: macros.fat,
                }} />
            </Suspense>
          </div>
        </Sheet>
      )}
      {editEntry && (
        <Suspense fallback={null}>
          <FoodEntryModal
            initialEditEntry={editEntry}
            onClose={onCloseEdit}
            onPhotoChanged={() => void c.refreshAfterSave()}
            onSaved={() => { onCloseEdit(); void c.refreshAfterSave(); onSaved?.(); }}
          />
        </Suspense>
      )}
      <Suspense fallback={null}>
        {copyDayOpen && c.userId && (
          <CopyDayModal
            isOpen={copyDayOpen}
            onClose={onCloseCopyDay}
            userId={c.userId}
            targetDate={c.today}
            onCopied={() => { void c.refreshAfterSave(); onSaved?.(); }}
          />
        )}
      </Suspense>
    </>
  );
}

export default function MealComposerView({ c, photoUrls, nutrients, energy, macros, week, onSaved }: Props) {
  const [editEntry, setEditEntry] = useState<RecentEntry | null>(null);
  const [copyDayOpen, setCopyDayOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const hasCalories = c.allTodayEntries.some((entry) => entry.calories != null) || c.totals.calories > 0;

  return (
    <>
      <Card className="meal-composer space-y-2 border-border-custom/80 bg-surface p-4">
        <MealMacroBar
          calories={hasCalories ? c.totals.calories : null} targetKcal={c.totals.targetKcal}
          protein={c.allTodayEntries.some((entry) => entry.protein != null) || c.totals.protein > 0 ? c.totals.protein : null} targetProtein={c.totals.targetProtein}
          targetFat={c.totals.targetFat} targetCarbs={c.totals.targetCarbs}
          fat={macros.fat}
          carbs={macros.carbs}
        />
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
          nutrients={nutrients}
          energy={energy}
          hasEntries={hasCalories}
        />
        {c.userId && c.logDate === c.today && (
          <Button variant="ghost" size="sm" onClick={() => setPlannerOpen(true)} icon={<ChefHat size={16} />}>
            Zaplanuj posiłki
          </Button>
        )}
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
            dateLabel={c.logDate === c.today ? 'Zjedzone' : c.logDate === c.yesterday ? 'Zjedzone · wczoraj' : `Zjedzone · ${c.logDate}`}
          />
        )}
        {c.error && <p role="alert" className="text-xs text-danger text-center font-medium">{c.error}</p>}
      </Card>
      <MealComposerModals
        c={c} macros={macros} onSaved={onSaved}
        plannerOpen={plannerOpen} onClosePlanner={() => setPlannerOpen(false)}
        editEntry={editEntry} onCloseEdit={() => setEditEntry(null)}
        copyDayOpen={copyDayOpen} onCloseCopyDay={() => setCopyDayOpen(false)}
      />
    </>
  );
}
