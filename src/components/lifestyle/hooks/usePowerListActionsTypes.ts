import type { TaskSlot, DailyWinWithTasks, ProjectOption } from '../usePowerListTypes';
import type { useDirectionContext } from '../direction/hooks/useDirectionContext';
import type { PillarProjectBinding } from '../../../lib/dailyPlanProposal';

type DirectionContextValue = ReturnType<typeof useDirectionContext>;

export interface UsePowerListActionsArgs {
  userId: string;
  today: string;
  direction: DirectionContextValue;
  pillarProjects: PillarProjectBinding[];
  newTaskForm: TaskSlot[];
  setNewTaskForm: React.Dispatch<React.SetStateAction<TaskSlot[]>>;
  checkpointPrompt: { index: number; checkpointId: string; title: string } | null;
  setCheckpointPrompt: React.Dispatch<React.SetStateAction<{ index: number; checkpointId: string; title: string } | null>>;
  setMarkingCheckpoint: React.Dispatch<React.SetStateAction<boolean>>;
  yesterdayWin: DailyWinWithTasks | null;
  yesterdayNote: string;
  yesterdayDayScore: number;
  yesterdayMoodScore: number;
  yesterdayNoteRequired: boolean;
  submitting: boolean;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  eveningNote: string;
  savingEvening: boolean;
  setSavingEvening: React.Dispatch<React.SetStateAction<boolean>>;
  todaySlotKpis: Record<number, string>;
  onUpdate?: (data: Record<string, unknown>) => void;
  setTodaySlotKpis: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  allProjectOptions: ProjectOption[];
}
