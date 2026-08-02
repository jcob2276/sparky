import { useRef, useState, type ComponentProps } from 'react';
import PowerListSetup from '../lifestyle/powerList/PowerListSetup';
import { EMPTY_SLOT, type DailyWinWithTasks, type TaskSlot } from '../lifestyle/usePowerListTypes';
import type { TodoItemRow } from '../../lib/todo/todo';

const DIRECTION: ComponentProps<typeof PowerListSetup>['direction'] = {
  weekStart: '2026-07-27',
  weekGoals: undefined,
  weekGoalsMeta: undefined,
  mustPins: undefined,
  openMustPins: undefined,
  parentSkills: [],
  parentSkillsRaw: [],
  urgentTodos: undefined,
  activeProjects: undefined,
  powerListStats: undefined,
  sprintGoal: undefined,
  sprintLabel: undefined,
  sprintFocusProjectIds: [],
  monthTheme: undefined,
  monthLabel: undefined,
  bhagLine: undefined,
  focus: undefined,
  weekCheckpointsDone: undefined,
  weekCheckpointsDue: undefined,
  skills: undefined,
  checkpoints: { all: [], overdue: [], upcoming: [] },
  loading: false,
  reload: async () => undefined,
};

const PREVIEW_WIN = {
  id: 'preview-yesterday',
  date: '2026-07-31',
  daily_win_tasks: [
    { id: 'preview-1', title: 'Sauna', slot: 1, done: true },
    { id: 'preview-2', title: 'Dykcja', slot: 2, done: false },
    { id: 'preview-3', title: 'Booki', slot: 3, done: false },
    { id: 'preview-4', title: 'Odpisać', slot: 4, done: true },
    { id: 'preview-5', title: 'Piłeczka', slot: 5, done: false },
  ],
} as DailyWinWithTasks;

const PREVIEW_TODOS = [
  { id: 'todo-1', title: 'Dokończyć plan oferty', due_date: null, status: 'open', priority: 'high', category: 'Praca' },
  { id: 'todo-2', title: 'Zrobić holistyczne badania', due_date: null, status: 'open', priority: 'normal', category: 'Ciało' },
] as TodoItemRow[];

export default function FunctionalIosPilotGallery() {
  const [yesterdayWin, setYesterdayWin] = useState(PREVIEW_WIN);
  const [yesterdayNote, setYesterdayNote] = useState('');
  const [dayScore, setDayScore] = useState(7);
  const [moodScore, setMoodScore] = useState(3);
  const [pickerSlot, setPickerSlot] = useState(-1);
  const [tasks, setTasks] = useState<TaskSlot[]>(
    Array.from({ length: 5 }, () => ({ ...EMPTY_SLOT })),
  );
  const pickerRef = useRef<HTMLDivElement>(null);

  const updateSlot = (index: number, update: Partial<TaskSlot>) => {
    setTasks((current) => current.map((slot, slotIndex) => (
      slotIndex === index ? { ...slot, ...update } : slot
    )));
  };

  const toggleYesterdayTask = (taskId: string) => {
    setYesterdayWin((current) => ({
      ...current,
      daily_win_tasks: current.daily_win_tasks?.map((task) => (
        task.id === taskId ? { ...task, done: !task.done } : task
      )),
    }));
  };

  return (
    <section aria-labelledby="functional-ios-pilot-title" className="space-y-4">
      <header className="px-1">
        <p className="ios-section-label">Functional iOS · pilot</p>
        <h2 id="functional-ios-pilot-title" className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
          Rytuał startu
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Rzeczywiste komponenty z lokalnym stanem demonstracyjnym.
        </p>
      </header>

      <PowerListSetup
        yesterdayWin={yesterdayWin}
        yesterdayNote={yesterdayNote}
        setYesterdayNote={setYesterdayNote}
        yesterdayDayScore={dayScore}
        setYesterdayDayScore={setDayScore}
        yesterdayMoodScore={moodScore}
        setYesterdayMoodScore={setMoodScore}
        yesterdayNoteRequired
        toggleYesterdayTask={toggleYesterdayTask}
        savingYesterdayTaskIds={new Set()}
        direction={DIRECTION}
        fillSlotFromCheckpoint={() => undefined}
        occupiedSlots={[false, false, false, false, false]}
        newTaskForm={tasks}
        updateSlot={updateSlot}
        todoItems={PREVIEW_TODOS}
        pickerSlot={pickerSlot}
        setPickerSlot={setPickerSlot}
        pickerRef={pickerRef}
        startNewDay={() => undefined}
        submitting={false}
      />
    </section>
  );
}
