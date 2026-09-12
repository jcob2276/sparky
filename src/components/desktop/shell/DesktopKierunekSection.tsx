import HexagonPanel from '../general/HexagonPanel';
import LeniePanelMini from '../health/LeniePanelMini';
import HabitsPanel from '../health/HabitsPanel';
import BehaviorCapturePanel from '../general/BehaviorCapturePanel';
import SupplementsPanel from '../health/SupplementsPanel';
import DreamsPanel from '../vision/DreamsPanel';
import VisionBoardPanel from '../vision/VisionBoardPanel';
import type { useHabitsData } from '../health/useHabitsData';
import type { useDreamsData } from '../vision/useDreamsData';
import type { useDesktopData } from './useDesktopData';

interface Props {
  userId?: string;
  theme: string;
  grid: string;
  refresh: () => void;
  lenieLogs: ReturnType<typeof useDesktopData>['lenieLogs'];
  habitsData: ReturnType<typeof useHabitsData>;
  dreamsData: ReturnType<typeof useDreamsData>;
}

export default function DesktopKierunekSection({
  userId,
  theme,
  grid,
  refresh,
  lenieLogs,
  habitsData,
  dreamsData,
}: Props) {
  return (
    <section id="kierunek" className="scroll-mt-28 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-custom" />
        <span className="pixel-label">Kierunek długoterminowy</span>
        <div className="h-px flex-1 bg-border-custom" />
      </div>
      {userId && <HexagonPanel userId={userId} theme={theme} grid={grid} onSaved={refresh} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LeniePanelMini logs={lenieLogs} />
        <HabitsPanel
          habits={habitsData.habits}
          habitLogs={habitsData.habitLogs}
          isAddingHabit={habitsData.isAddingHabit}
          setIsAddingHabit={habitsData.setIsAddingHabit}
          newHabit={habitsData.newHabit}
          setNewHabit={habitsData.setNewHabit}
          addHabit={habitsData.addHabit}
          deleteHabit={habitsData.deleteHabit}
          toggleHabit={habitsData.toggleHabit}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {userId && <BehaviorCapturePanel userId={userId} />}
        {userId && <SupplementsPanel userId={userId} />}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <DreamsPanel
          dreams={dreamsData.dreams}
          doneDreams={dreamsData.doneDreams}
          top5Dreams={dreamsData.top5Dreams}
          filteredDreams={dreamsData.filteredDreams}
          dreamFilter={dreamsData.dreamFilter}
          setDreamFilter={dreamsData.setDreamFilter}
          isAddingDream={dreamsData.isAddingDream}
          setIsAddingDream={dreamsData.setIsAddingDream}
          newDreamTitle={dreamsData.newDreamTitle}
          setNewDreamTitle={dreamsData.setNewDreamTitle}
          newDreamCategory={dreamsData.newDreamCategory}
          setNewDreamCategory={dreamsData.setNewDreamCategory}
          newDreamLifeGoal={dreamsData.newDreamLifeGoal}
          setNewDreamLifeGoal={dreamsData.setNewDreamLifeGoal}
          addDream={dreamsData.addDream}
          openDreamModal={dreamsData.openDreamModal}
          toggleDream={dreamsData.toggleDream}
          deleteDream={dreamsData.deleteDream}
          DREAM_CATEGORIES={dreamsData.DREAM_CATEGORIES}
          DREAM_CAT_LABEL={dreamsData.DREAM_CAT_LABEL}
          DREAM_CAT_COLOR={dreamsData.DREAM_CAT_COLOR}
        />
        <VisionBoardPanel
          visionItems={dreamsData.visionItems}
          isAddingVision={dreamsData.isAddingVision}
          setIsAddingVision={dreamsData.setIsAddingVision}
          newVisionType={dreamsData.newVisionType}
          setNewVisionType={dreamsData.setNewVisionType}
          newVisionColor={dreamsData.newVisionColor}
          setNewVisionColor={dreamsData.setNewVisionColor}
          newVisionContent={dreamsData.newVisionContent}
          setNewVisionContent={dreamsData.setNewVisionContent}
          addVisionItem={dreamsData.addVisionItem}
          deleteVisionItem={dreamsData.deleteVisionItem}
          VB_COLORS={dreamsData.VB_COLORS}
        />
      </div>
    </section>
  );
}
